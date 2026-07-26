using System.Security.Claims;
using System.Threading.RateLimiting;
using Anthropic;
using CvMakerPro.Api.Assist;
using CvMakerPro.Api.Data;
using CvMakerPro.Api.Documents;
using CvMakerPro.Domain;
using CvMakerPro.Domain.Json;
using CvMakerPro.Render;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

/*
 * The SPA is served from this same application, which is why there is no CORS configuration
 * anywhere in this file. One origin means cookies work without SameSite gymnastics, there is no
 * token for the browser to store, and the whole thing deploys as a single container.
 */

builder.Services.ConfigureHttpJsonOptions(options => CvJson.Configure(options.SerializerOptions));

builder.Services.AddDbContext<CvDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        // Length does more for entropy than character-class rules, which mostly produce
        // "Password1!" and a note on a sticky label.
        options.Password.RequiredLength = 10;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireDigit = false;
    })
    .AddEntityFrameworkStores<CvDbContext>();

builder.Services.AddAuthorization();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<DocumentService>();

builder.Services.AddSingleton(new BrowserOptions
{
    ExecutablePath = builder.Configuration["Chromium:ExecutablePath"],
});
builder.Services.AddSingleton<IBrowserProvider, BrowserProvider>();
builder.Services.AddSingleton<HtmlSanitiser>();
builder.Services.AddSingleton<TemplateAssets>();
builder.Services.AddSingleton<IPdfRenderer, PdfRenderer>();

builder.Services.AddSingleton(_ => new AnthropicClient
{
    ApiKey = builder.Configuration["Anthropic:ApiKey"]
        ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY"),
});
builder.Services.AddScoped<AssistService>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Rendering spins up a browser page and the assistant costs money per call. Both are limited
    // per user rather than per IP, because the expensive resource is tied to an account.
    options.AddPolicy("render", context => PerUser(context, permit: 20, windowMinutes: 1));
    options.AddPolicy("assist", context => PerUser(context, permit: 30, windowMinutes: 5));
});

var app = builder.Build();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

var documents = app.MapGroup("/api/documents").RequireAuthorization();

documents.MapGet("/", async (ClaimsPrincipal user, DocumentService service, CancellationToken ct) =>
    Results.Ok(await service.ListAsync(UserId(user), ct)));

documents.MapPost("/", async (ClaimsPrincipal user, CvDocument document, DocumentService service, CancellationToken ct) =>
{
    var created = await service.CreateAsync(UserId(user), document, ct);
    return Results.Created($"/api/documents/{created.Id}", created);
});

documents.MapGet("/{id:guid}", async (ClaimsPrincipal user, Guid id, DocumentService service, CancellationToken ct) =>
    await service.GetAsync(UserId(user), id, ct) is { } document
        ? Results.Ok(document)
        : Results.NotFound());

documents.MapPut("/{id:guid}", async (ClaimsPrincipal user, Guid id, CvDocument document, DocumentService service, CancellationToken ct) =>
{
    try
    {
        return Results.Ok(await service.UpdateAsync(UserId(user), id, document, ct));
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (StaleDocumentException error)
    {
        // 409 rather than 400: the request was well-formed, the world moved. The client shows a
        // "this CV changed in another tab" prompt rather than a validation error.
        return Results.Conflict(new { error.Expected, error.Actual, message = error.Message });
    }
});

documents.MapDelete("/{id:guid}", async (ClaimsPrincipal user, Guid id, DocumentService service, CancellationToken ct) =>
    await service.DeleteAsync(UserId(user), id, ct) ? Results.NoContent() : Results.NotFound());

documents.MapGet("/{id:guid}/versions", async (ClaimsPrincipal user, Guid id, DocumentService service, CancellationToken ct) =>
    Results.Ok(await service.ListVersionsAsync(UserId(user), id, ct)));

documents.MapGet("/{id:guid}/versions/{version:int}", async (ClaimsPrincipal user, Guid id, int version, DocumentService service, CancellationToken ct) =>
    await service.GetVersionAsync(UserId(user), id, version, ct) is { } document
        ? Results.Ok(document)
        : Results.NotFound());

app.MapPost("/api/render/pdf", async (RenderRequest request, IPdfRenderer renderer, CancellationToken ct) =>
{
    try
    {
        var pdf = await renderer.RenderAsync(request, ct);
        return Results.File(pdf, "application/pdf", $"{Slug(request.DocumentTitle)}.pdf");
    }
    catch (UnknownTemplateException error)
    {
        return Results.BadRequest(new { message = error.Message });
    }
})
.RequireRateLimiting("render");

var assist = app.MapGroup("/api/assist").RequireAuthorization().RequireRateLimiting("assist");

assist.MapPost("/bullet", async (BulletRequest request, AssistService service, CancellationToken ct) =>
{
    try
    {
        return Results.Ok(await service.RewriteBulletAsync(request, ct));
    }
    catch (AssistUnavailableException error)
    {
        return Results.Problem(error.Message, statusCode: StatusCodes.Status502BadGateway);
    }
});

assist.MapPost("/tailor", async (TailorRequest request, AssistService service, CancellationToken ct) =>
{
    try
    {
        return Results.Ok(await service.TailorAsync(request, ct));
    }
    catch (AssistUnavailableException error)
    {
        return Results.Problem(error.Message, statusCode: StatusCodes.Status502BadGateway);
    }
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Serve the built SPA and let client-side routing own everything that is not an API path.
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();

static string UserId(ClaimsPrincipal user) =>
    user.FindFirstValue(ClaimTypes.NameIdentifier)
    ?? throw new InvalidOperationException("Authenticated request carried no subject claim.");

static string Slug(string title)
{
    var cleaned = new string(title.Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-').ToArray());
    var collapsed = string.Join('-', cleaned.Split('-', StringSplitOptions.RemoveEmptyEntries));
    return collapsed.Length == 0 ? "cv" : collapsed;
}

static RateLimitPartition<string> PerUser(HttpContext context, int permit, int windowMinutes) =>
    RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permit,
            Window = TimeSpan.FromMinutes(windowMinutes),
        });

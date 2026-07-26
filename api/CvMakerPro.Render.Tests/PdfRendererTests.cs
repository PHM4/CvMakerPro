using CvMakerPro.Domain;
using CvMakerPro.Render;
using Microsoft.Extensions.Logging.Abstractions;
using UglyToad.PdfPig;

namespace CvMakerPro.Render.Tests;

/// <summary>
/// Prints real PDFs with a real browser.
///
/// These are slow and they need Chromium, which is exactly why they exist. Every cheap assertion
/// about the print pipeline is an assertion about code that has never actually printed anything —
/// the failures worth catching here are page geometry, missing fonts, and blocked requests, and
/// none of those show up until Chromium runs.
/// </summary>
[Trait("Category", "Integration")]
public class PdfRendererTests : IAsyncLifetime
{
    private BrowserProvider _browsers = null!;
    private PdfRenderer _renderer = null!;

    public Task InitializeAsync()
    {
        _browsers = new BrowserProvider(new BrowserOptions(), NullLogger<BrowserProvider>.Instance);
        _renderer = new PdfRenderer(
            _browsers,
            new HtmlSanitiser(),
            new TemplateAssets(),
            NullLogger<PdfRenderer>.Instance);

        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _browsers.DisposeAsync();

    [Fact]
    public async Task Prints_one_pdf_page_per_sheet()
    {
        var pdf = await _renderer.RenderAsync(Request(Sheet("First sheet"), Sheet("Second sheet")));

        using var document = PdfDocument.Open(pdf);
        Assert.Equal(2, document.NumberOfPages);
    }

    [Fact]
    public async Task The_page_is_the_size_the_theme_asked_for()
    {
        var pdf = await _renderer.RenderAsync(Request(Sheet("A4 sheet")));

        using var document = PdfDocument.Open(pdf);
        var page = document.GetPage(1);

        // A4 is 210 x 297mm; PDF points are 1/72 inch, so 595.3 x 841.9.
        Assert.Equal(595.3, page.Width, 0.5);
        Assert.Equal(841.9, page.Height, 0.5);
    }

    [Fact]
    public async Task US_Letter_is_honoured_rather_than_silently_refitted()
    {
        var theme = Theme.Default with { Page = PageGeometry.Letter };
        var pdf = await _renderer.RenderAsync(Request(Sheet("Letter sheet")) with { Theme = theme });

        using var document = PdfDocument.Open(pdf);
        var page = document.GetPage(1);

        // 215.9 x 279.4mm => 612 x 792pt. Without PreferCSSPageSize Chromium quietly refits to
        // its own default and the margins all move.
        Assert.Equal(612, page.Width, 1);
        Assert.Equal(792, page.Height, 1);
    }

    [Fact]
    public async Task The_document_text_survives_to_the_pdf()
    {
        var pdf = await _renderer.RenderAsync(Request(Sheet("Rowan Whitaker")));

        using var document = PdfDocument.Open(pdf);
        Assert.Contains("Rowan Whitaker", document.GetPage(1).Text);
    }

    [Fact]
    public async Task The_embedded_typeface_is_used_rather_than_a_fallback()
    {
        // If the @font-face data URI failed to load, Chromium would silently substitute a system
        // serif and every line would break in a different place than the preview showed.
        var pdf = await _renderer.RenderAsync(Request(Sheet("Rowan Whitaker")));

        using var document = PdfDocument.Open(pdf);
        var fonts = document.GetPage(1).Letters.Select(letter => letter.FontName).Distinct().ToList();

        Assert.Contains(fonts, name => name.Contains("SourceSerif", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Script_in_the_payload_never_reaches_the_printed_page()
    {
        var hostile = """
            <div class="paper-page sable">
              <h1 class="sable-name">Rowan Whitaker</h1>
              <script>document.querySelector('h1').textContent = 'Owned'</script>
              <img src="https://tracker.example/pixel.gif">
            </div>
            """;

        var pdf = await _renderer.RenderAsync(Request(hostile));

        using var document = PdfDocument.Open(pdf);
        var text = document.GetPage(1).Text;

        Assert.Contains("Rowan Whitaker", text);
        Assert.DoesNotContain("Owned", text);
    }

    [Fact]
    public async Task An_unknown_template_is_rejected_before_the_browser_is_touched()
    {
        await Assert.ThrowsAsync<UnknownTemplateException>(() =>
            _renderer.RenderAsync(Request(Sheet("x")) with { TemplateId = "../../etc/passwd" }));
    }

    private static string Sheet(string heading) => $"""
        <div class="paper-page sable">
          <div class="paper-block"><h1 class="sable-name">{heading}</h1></div>
        </div>
        """;

    private static RenderRequest Request(params string[] sheets) => new()
    {
        TemplateId = "sable",
        BodyHtml = string.Join('\n', sheets),
        Theme = Theme.Default,
        DocumentTitle = "Test CV",
    };
}

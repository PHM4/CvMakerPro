using System.Net;
using System.Text;
using Microsoft.Extensions.Logging;
using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace CvMakerPro.Render;

public interface IPdfRenderer
{
    Task<byte[]> RenderAsync(RenderRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Prints a CV by loading the preview's own markup in headless Chromium.
///
/// The whole point of the exercise is that no second layout engine is involved. Both the
/// preview and this share one stylesheet, one box model and one set of embedded fonts, so
/// the PDF is not an interpretation of the preview — it is the same page, printed.
///
/// The page is rendered under three restrictions, in order of how much they matter:
///
///   1. Every network request is aborted. Nothing is fetched, so nothing in the markup
///      can phone home or pull in a font that differs from the embedded one.
///   2. JavaScript is off. The markup is static by construction and script would only
///      ever be someone else's idea.
///   3. The markup has already been through <see cref="HtmlSanitiser"/>.
/// </summary>
public sealed class PdfRenderer(IBrowserProvider browsers, HtmlSanitiser sanitiser, TemplateAssets assets, ILogger<PdfRenderer> logger)
    : IPdfRenderer
{
    public async Task<byte[]> RenderAsync(RenderRequest request, CancellationToken cancellationToken = default)
    {
        var stylesheet = assets.Stylesheet(request.TemplateId);
        var body = sanitiser.Sanitise(request.BodyHtml);
        var html = Compose(request.DocumentTitle, stylesheet + PaperVariables.Build(request.Theme), body);

        var browser = await browsers.GetAsync(cancellationToken);
        await using var page = await browser.NewPageAsync();

        await page.SetJavaScriptEnabledAsync(false);
        await page.SetRequestInterceptionAsync(true);

        var blocked = 0;
        page.Request += async (_, args) =>
        {
            // SetContentAsync serves the document itself without a request, so anything
            // arriving here came out of the payload and is refused.
            Interlocked.Increment(ref blocked);
            await args.Request.AbortAsync(RequestAbortErrorCode.BlockedByClient);
        };

        await page.SetContentAsync(html, new SetContentOptions
        {
            // Not NetworkIdle: every request is being aborted, so a network-based wait
            // either fires immediately or hangs until it times out. The document is
            // complete once it has been parsed and laid out.
            WaitUntil = [WaitUntilNavigation.DOMContentLoaded],
        });

        // Fonts are data URIs in the stylesheet, so this resolves without any fetch — but
        // it still has to be awaited, or the first page prints in a fallback face.
        await page.EvaluateExpressionHandleAsync("document.fonts.ready");

        var pdf = await page.PdfDataAsync(new PdfOptions
        {
            // The sheets already carry their own size and padding. PreferCSSPageSize
            // makes the @page rule authoritative so Chromium does not re-fit to Letter.
            PreferCSSPageSize = true,
            PrintBackground = true,
            MarginOptions = new MarginOptions
            {
                Top = "0",
                Right = "0",
                Bottom = "0",
                Left = "0",
            },
        });

        if (blocked > 0)
        {
            logger.LogWarning(
                "Blocked {Count} network request(s) while printing template {TemplateId}. The markup referenced something remote.",
                blocked,
                request.TemplateId);
        }

        return pdf;
    }

    private static string Compose(string title, string css, string body)
    {
        var builder = new StringBuilder();
        builder.Append("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">");
        builder.Append("<title>").Append(WebUtility.HtmlEncode(title)).Append("</title>");
        builder.Append("<style>").Append(css).Append("</style>");
        builder.Append("</head><body>").Append(body).Append("</body></html>");
        return builder.ToString();
    }
}

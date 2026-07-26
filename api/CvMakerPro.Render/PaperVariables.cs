using System.Globalization;
using CvMakerPro.Domain;

namespace CvMakerPro.Render;

/// <summary>
/// The custom properties the paper and template stylesheets read.
///
/// This is a deliberate duplicate of web/src/preview/paperStyles.ts. The client could
/// simply post the CSS it is already using and save the duplication, but then the render
/// service would be executing stylesheet text supplied by whoever called it. Regenerating
/// the variables here from a typed theme means the only thing crossing the wire is
/// document markup, and the printer's stylesheet is entirely ours.
///
/// Both sides are pinned by golden tests against the same expected string, so the copies
/// cannot quietly drift.
/// </summary>
public static class PaperVariables
{
    private static readonly Dictionary<Density, double> DensityScale = new()
    {
        [Density.Compact] = 0.78,
        [Density.Normal] = 1,
        [Density.Relaxed] = 1.24,
    };

    public static string Build(Theme theme)
    {
        var page = theme.Page;
        var margins = page.MarginMm;

        // $$ so that a single brace is literal CSS and {{ }} marks interpolation. With a
        // single $ every brace in the stylesheet would have to be doubled.
        return $$"""

            :root {
              --page-width: {{Mm(page.WidthMm)}};
              --page-height: {{Mm(page.HeightMm)}};
              --page-margin-top: {{Mm(margins.Top)}};
              --page-margin-right: {{Mm(margins.Right)}};
              --page-margin-bottom: {{Mm(margins.Bottom)}};
              --page-margin-left: {{Mm(margins.Left)}};
              --page-content-width: {{Mm(page.ContentWidthMm)}};
              --page-content-height: {{Mm(page.ContentHeightMm)}};
              --doc-accent: {{SafeColor(theme.AccentColor)}};
              --doc-font: '{{SafeFontFamily(theme.FontFamily)}}';
              --font-scale: {{Number(theme.FontScale)}};
              --density: {{Number(DensityScale[theme.Density])}};
            }

            @page {
              size: {{Mm(page.WidthMm)}} {{Mm(page.HeightMm)}};
              margin: 0;
            }

            """;
    }

    private static string Mm(double value) =>
        value.ToString("0.####", CultureInfo.InvariantCulture) + "mm";

    private static string Number(double value) =>
        value.ToString("0.####", CultureInfo.InvariantCulture);

    /// <summary>
    /// These values are interpolated straight into a stylesheet, so anything that could
    /// close a declaration and open another is rejected outright rather than escaped.
    /// The theme is validated on save too; this is the second lock on the same door.
    /// </summary>
    private static string SafeColor(string value) =>
        System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$")
            ? value
            : "#16150f";

    private static string SafeFontFamily(string value)
    {
        var cleaned = new string(value.Where(c => char.IsLetterOrDigit(c) || c is ' ' or '-').ToArray()).Trim();
        return cleaned.Length is > 0 and <= 64 ? cleaned : "Source Serif 4 Variable";
    }
}

namespace CvMakerPro.Domain;

/// <summary>
/// Presentation knobs that survive a template switch. Anything a single template
/// cannot honour belongs in the template, not here — this stays deliberately small.
/// </summary>
public sealed record Theme
{
    public static readonly Theme Default = new()
    {
        TemplateId = "sable",
        AccentColor = "#1f2933",
        FontFamily = "Source Serif 4",
    };

    public required string TemplateId { get; init; }

    /// <summary>Hex, <c>#rrggbb</c>. Validated on save — it lands in a stylesheet.</summary>
    public required string AccentColor { get; init; }

    public required string FontFamily { get; init; }

    /// <summary>Multiplier on the template's base type size. Clamped by <see cref="Clamp"/>.</summary>
    public double FontScale { get; init; } = 1.0;

    public Density Density { get; init; } = Density.Normal;

    public PageGeometry Page { get; init; } = PageGeometry.A4;

    /// <summary>
    /// Keeps a document renderable no matter what a client posts. Type below ~8.5pt
    /// stops being readable in print and starts being a way to cheat the page count.
    /// </summary>
    public Theme Clamp() => this with
    {
        FontScale = Math.Clamp(FontScale, 0.85, 1.25),
        Page = Page.Clamp(),
    };
}

public enum Density
{
    Compact,
    Normal,
    Relaxed,
}

/// <summary>Paper size and margins in millimetres — the units Chromium's print engine takes.</summary>
public sealed record PageGeometry
{
    public static readonly PageGeometry A4 = new()
    {
        WidthMm = 210,
        HeightMm = 297,
        MarginMm = new Margins(18, 16, 18, 16),
    };

    public static readonly PageGeometry Letter = new()
    {
        WidthMm = 215.9,
        HeightMm = 279.4,
        MarginMm = new Margins(18, 16, 18, 16),
    };

    public required double WidthMm { get; init; }
    public required double HeightMm { get; init; }
    public required Margins MarginMm { get; init; }

    public double ContentWidthMm => WidthMm - MarginMm.Left - MarginMm.Right;
    public double ContentHeightMm => HeightMm - MarginMm.Top - MarginMm.Bottom;

    /// <summary>Margins under 8mm get clipped by most office printers.</summary>
    public PageGeometry Clamp() => this with { MarginMm = MarginMm.Clamp(8, 40) };
}

public readonly record struct Margins(double Top, double Right, double Bottom, double Left)
{
    public Margins Clamp(double min, double max) => new(
        Math.Clamp(Top, min, max),
        Math.Clamp(Right, min, max),
        Math.Clamp(Bottom, min, max),
        Math.Clamp(Left, min, max));
}

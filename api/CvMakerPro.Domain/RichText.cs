using System.Text.Json.Serialization;

namespace CvMakerPro.Domain;

/// <summary>
/// Formatted text stored as runs rather than markup. The export pipeline prints
/// user content through a sanitiser, and a run list gives it nothing to sanitise:
/// every tag in the output HTML is one we emitted ourselves.
/// </summary>
public sealed record RichText
{
    public static readonly RichText Empty = new() { Runs = [] };

    public required EquatableArray<TextRun> Runs { get; init; }

    public static RichText Plain(string text) =>
        new() { Runs = [new TextRun { Text = text }] };

    [JsonIgnore]
    public bool IsEmpty => Runs.All(run => string.IsNullOrWhiteSpace(run.Text));

    /// <summary>Concatenated text with all formatting dropped — used for search and ATS checks.</summary>
    public string ToPlainText() => string.Concat(Runs.Select(run => run.Text));
}

public sealed record TextRun
{
    public required string Text { get; init; }

    public TextMarks Marks { get; init; } = TextMarks.None;

    /// <summary>Set only when <see cref="Marks"/> includes <see cref="TextMarks.Link"/>.</summary>
    public Uri? Href { get; init; }
}

[Flags]
public enum TextMarks
{
    None = 0,
    Bold = 1 << 0,
    Italic = 1 << 1,
    Code = 1 << 2,
    Link = 1 << 3,
}

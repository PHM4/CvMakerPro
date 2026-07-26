using System.Text.Json.Serialization;

namespace CvMakerPro.Domain;

/// <summary>
/// The whole CV. Templates are pure functions of this — nothing about layout,
/// pagination or the chosen template's quirks is allowed to leak in here, because
/// the moment it does, switching template starts losing data.
/// </summary>
public sealed record CvDocument
{
    public required Guid Id { get; init; }

    /// <summary>The user's own name for the document ("Grad scheme applications"), not the CV heading.</summary>
    public required string Title { get; init; }

    public required Header Header { get; init; }

    public required EquatableArray<Section> Sections { get; init; }

    public required Theme Theme { get; init; }

    /// <summary>Bumped on every accepted write. Concurrent edits from two tabs are rejected on a stale value.</summary>
    public int Version { get; init; }

    public DateTimeOffset UpdatedAt { get; init; }

    [JsonIgnore]
    public IEnumerable<Section> VisibleSections =>
        Sections.Where(section => !section.Hidden && !section.IsEmpty);
}

public sealed record Header
{
    public required string FullName { get; init; }

    /// <summary>The line under the name — "Final-year Computer Science student", not a summary paragraph.</summary>
    public string? Headline { get; init; }

    public EquatableArray<ContactItem> Contacts { get; init; } = [];
}

public sealed record ContactItem
{
    public required string Id { get; init; }

    public required ContactKind Kind { get; init; }

    /// <summary>What gets printed. For a link this is the display text, not the target.</summary>
    public required string Value { get; init; }

    public Uri? Href { get; init; }
}

public enum ContactKind
{
    Email,
    Phone,
    Location,
    Website,
    LinkedIn,
    GitHub,
    Other,
}

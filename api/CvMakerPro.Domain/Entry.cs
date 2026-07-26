namespace CvMakerPro.Domain;

/// <summary>
/// One item in a CV section — a job, a degree, a project, a publication.
/// These read differently but lay out identically, so they share a shape and
/// let the template decide what to emphasise.
/// </summary>
public sealed record Entry
{
    public required string Id { get; init; }

    /// <summary>Job title, degree, or project name.</summary>
    public required string Title { get; init; }

    /// <summary>Employer, university, or publisher.</summary>
    public string? Organisation { get; init; }

    public string? Location { get; init; }

    public DateRange? Dates { get; init; }

    public Uri? Link { get; init; }

    public EquatableArray<RichText> Bullets { get; init; } = [];

    /// <summary>Technologies or keywords. Templates may render these as a chip row or fold them into a line.</summary>
    public EquatableArray<string> Tags { get; init; } = [];
}

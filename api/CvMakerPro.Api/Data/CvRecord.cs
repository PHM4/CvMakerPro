namespace CvMakerPro.Api.Data;

/// <summary>
/// A saved CV.
///
/// The document is stored as one jsonb column rather than shredded into tables. It is a
/// tree that is always read and written whole, and nothing queries inside it — the
/// relational version would be six tables, a pile of joins, and an ordering column on
/// every one of them, in exchange for nothing this app asks for.
/// </summary>
public sealed class CvRecord
{
    public Guid Id { get; set; }

    public required string OwnerId { get; set; }

    /// <summary>Denormalised out of the document so the list page does not parse every CV to draw itself.</summary>
    public required string Title { get; set; }

    public required string DocumentJson { get; set; }

    /// <summary>Incremented on every accepted write. A stale value is how a second tab is caught.</summary>
    public int Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public List<CvSnapshot> Snapshots { get; set; } = [];
}

/// <summary>
/// A previous state of a CV, kept so an edit can be undone after the tab is closed.
///
/// Written on a schedule rather than on every save: autosave fires every few seconds and
/// a row per keystroke-burst would bury the two or three snapshots anyone actually wants.
/// </summary>
public sealed class CvSnapshot
{
    public long Id { get; set; }

    public Guid CvId { get; set; }

    public int Version { get; set; }

    public required string DocumentJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

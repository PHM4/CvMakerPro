using CvMakerPro.Api.Data;
using CvMakerPro.Domain;
using CvMakerPro.Domain.Json;
using Microsoft.EntityFrameworkCore;

namespace CvMakerPro.Api.Documents;

public sealed record DocumentSummary(Guid Id, string Title, int Version, DateTimeOffset UpdatedAt);

/// <summary>Raised when a save is based on a version the server has already moved past.</summary>
public sealed class StaleDocumentException(int expected, int actual)
    : Exception($"Document has moved on: the save was based on version {expected}, the server holds {actual}.")
{
    public int Expected { get; } = expected;
    public int Actual { get; } = actual;
}

/// <summary>
/// Reads and writes documents for one owner.
///
/// Every method takes an owner id and filters on it. Authorisation lives here rather than
/// only in the endpoint, because the endpoint is one line and the day someone adds a
/// second one that forgets the check is the day another user's CV is served.
/// </summary>
public sealed class DocumentService(CvDbContext db, TimeProvider clock)
{
    /// <summary>
    /// How long between retained snapshots. Autosave fires every few seconds; keeping one
    /// version per save would bury the handful anyone would actually want to go back to.
    /// </summary>
    private static readonly TimeSpan SnapshotInterval = TimeSpan.FromMinutes(10);

    public async Task<IReadOnlyList<DocumentSummary>> ListAsync(string ownerId, CancellationToken ct)
    {
        return await db.Cvs
            .Where(cv => cv.OwnerId == ownerId)
            .OrderByDescending(cv => cv.UpdatedAt)
            .Select(cv => new DocumentSummary(cv.Id, cv.Title, cv.Version, cv.UpdatedAt))
            .ToListAsync(ct);
    }

    public async Task<CvDocument?> GetAsync(string ownerId, Guid id, CancellationToken ct)
    {
        var record = await db.Cvs
            .AsNoTracking()
            .FirstOrDefaultAsync(cv => cv.Id == id && cv.OwnerId == ownerId, ct);

        return record is null ? null : CvJson.Deserialize(record.DocumentJson);
    }

    public async Task<CvDocument> CreateAsync(string ownerId, CvDocument document, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var stored = Sanitise(document) with { Id = Guid.NewGuid(), Version = 1, UpdatedAt = now };

        db.Cvs.Add(new CvRecord
        {
            Id = stored.Id,
            OwnerId = ownerId,
            Title = stored.Title,
            DocumentJson = CvJson.Serialize(stored),
            Version = stored.Version,
            CreatedAt = now,
            UpdatedAt = now,
        });

        await db.SaveChangesAsync(ct);
        return stored;
    }

    /// <summary>
    /// Saves an edit. <paramref name="document"/>.Version must match what the server holds:
    /// two tabs on one CV is a normal accident, and last-write-wins loses an afternoon of
    /// someone's work silently.
    /// </summary>
    public async Task<CvDocument> UpdateAsync(string ownerId, Guid id, CvDocument document, CancellationToken ct)
    {
        var record = await db.Cvs
            .Include(cv => cv.Snapshots)
            .FirstOrDefaultAsync(cv => cv.Id == id && cv.OwnerId == ownerId, ct)
            ?? throw new KeyNotFoundException();

        if (document.Version != record.Version)
        {
            throw new StaleDocumentException(document.Version, record.Version);
        }

        var now = clock.GetUtcNow();

        if (ShouldSnapshot(record, now))
        {
            db.Snapshots.Add(new CvSnapshot
            {
                CvId = record.Id,
                Version = record.Version,
                DocumentJson = record.DocumentJson,
                CreatedAt = now,
            });
        }

        var stored = Sanitise(document) with { Id = id, Version = record.Version + 1, UpdatedAt = now };

        record.Title = stored.Title;
        record.DocumentJson = CvJson.Serialize(stored);
        record.Version = stored.Version;
        record.UpdatedAt = now;

        await db.SaveChangesAsync(ct);
        return stored;
    }

    public async Task<bool> DeleteAsync(string ownerId, Guid id, CancellationToken ct)
    {
        var deleted = await db.Cvs
            .Where(cv => cv.Id == id && cv.OwnerId == ownerId)
            .ExecuteDeleteAsync(ct);

        return deleted > 0;
    }

    public async Task<IReadOnlyList<DocumentSummary>> ListVersionsAsync(string ownerId, Guid id, CancellationToken ct)
    {
        return await db.Snapshots
            .Where(snapshot => snapshot.CvId == id && db.Cvs.Any(cv => cv.Id == id && cv.OwnerId == ownerId))
            .OrderByDescending(snapshot => snapshot.Version)
            .Select(snapshot => new DocumentSummary(id, $"Version {snapshot.Version}", snapshot.Version, snapshot.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<CvDocument?> GetVersionAsync(string ownerId, Guid id, int version, CancellationToken ct)
    {
        var owns = await db.Cvs.AnyAsync(cv => cv.Id == id && cv.OwnerId == ownerId, ct);
        if (!owns)
        {
            return null;
        }

        var snapshot = await db.Snapshots
            .AsNoTracking()
            .FirstOrDefaultAsync(row => row.CvId == id && row.Version == version, ct);

        return snapshot is null ? null : CvJson.Deserialize(snapshot.DocumentJson);
    }

    private static bool ShouldSnapshot(CvRecord record, DateTimeOffset now)
    {
        var latest = record.Snapshots.Count == 0
            ? record.CreatedAt
            : record.Snapshots.Max(snapshot => snapshot.CreatedAt);

        return now - latest >= SnapshotInterval;
    }

    /// <summary>
    /// The client is not trusted about presentation. Everything else in the document is
    /// the user's own text and is stored as sent.
    /// </summary>
    private static CvDocument Sanitise(CvDocument document) => document with
    {
        Title = string.IsNullOrWhiteSpace(document.Title)
            ? "Untitled CV"
            : document.Title.Trim()[..Math.Min(document.Title.Trim().Length, 200)],
        Theme = document.Theme.Clamp(),
    };
}

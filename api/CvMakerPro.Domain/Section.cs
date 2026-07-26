using System.Text.Json.Serialization;

namespace CvMakerPro.Domain;

/// <summary>
/// Sections come in three body shapes, not one per CV concept. "Experience" and
/// "Projects" are the same shape with a different heading, so they are the same type —
/// which is what lets a document survive being poured into a different template.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(EntrySection), "entries")]
[JsonDerivedType(typeof(SkillSection), "skills")]
[JsonDerivedType(typeof(ProseSection), "prose")]
public abstract record Section
{
    public required string Id { get; init; }

    public required string Heading { get; init; }

    /// <summary>Kept in the document but omitted from render — how tailoring per application works without deleting anything.</summary>
    public bool Hidden { get; init; }

    public abstract bool IsEmpty { get; }
}

public sealed record EntrySection : Section
{
    public required EquatableArray<Entry> Entries { get; init; }

    public override bool IsEmpty => Entries.Count == 0;
}

public sealed record SkillSection : Section
{
    public required EquatableArray<SkillGroup> Groups { get; init; }

    public override bool IsEmpty => Groups.All(group => group.Skills.Count == 0);
}

public sealed record SkillGroup
{
    public required string Id { get; init; }

    /// <summary>Null renders an ungrouped run of skills rather than a blank label.</summary>
    public string? Label { get; init; }

    public required EquatableArray<string> Skills { get; init; }
}

/// <summary>A block of prose — the personal statement, or anything that resists being a list.</summary>
public sealed record ProseSection : Section
{
    public required RichText Body { get; init; }

    public override bool IsEmpty => Body.IsEmpty;
}

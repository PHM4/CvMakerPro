using CvMakerPro.Domain;

namespace CvMakerPro.Domain.Tests;

/// <summary>
/// Autosave decides whether to write by comparing the edited document to the last saved
/// one. These pin that comparison down — if collection equality ever regresses to
/// reference equality the app silently saves on every keystroke, or never saves at all.
/// </summary>
public class DocumentEqualityTests
{
    [Fact]
    public void Documents_with_equal_content_are_equal()
    {
        var a = Sample();
        var b = Sample();

        Assert.Equal(a, b);
        Assert.Equal(a.GetHashCode(), b.GetHashCode());
    }

    [Fact]
    public void Editing_a_bullet_makes_the_document_unequal()
    {
        var original = Sample();
        var edited = original with
        {
            Sections =
            [
                new EntrySection
                {
                    Id = "experience",
                    Heading = "Experience",
                    Entries =
                    [
                        new Entry
                        {
                            Id = "e1",
                            Title = "Software Engineer",
                            Bullets = [RichText.Plain("Cut deploy time to four minutes.")],
                        },
                    ],
                },
            ],
        };

        Assert.NotEqual(original, edited);
    }

    [Fact]
    public void Reordering_sections_makes_the_document_unequal()
    {
        var original = Sample();
        var reordered = original with { Sections = [.. original.Sections.Reverse()] };

        Assert.NotEqual(original, reordered);
    }

    [Fact]
    public void An_uninitialised_collection_behaves_as_empty()
    {
        var entry = new Entry { Id = "e1", Title = "Software Engineer" };

        Assert.Empty(entry.Tags);
        Assert.Equal(entry.Tags, new EquatableArray<string>([]));
    }

    private static CvDocument Sample() => new()
    {
        Id = Guid.Parse("6d9a5a4e-0f9c-4e1a-9b3b-2f6b0f4a1c77"),
        Title = "Grad applications",
        Header = new Header
        {
            FullName = "Ada Lovelace",
            Headline = "Final-year Computer Science student",
            Contacts = [new ContactItem { Id = "c1", Kind = ContactKind.Email, Value = "ada@example.com" }],
        },
        Sections =
        [
            new EntrySection
            {
                Id = "experience",
                Heading = "Experience",
                Entries =
                [
                    new Entry
                    {
                        Id = "e1",
                        Title = "Software Engineer",
                        Bullets = [RichText.Plain("Cut deploy time from an hour to four minutes.")],
                    },
                ],
            },
            new SkillSection
            {
                Id = "skills",
                Heading = "Skills",
                Groups = [new SkillGroup { Id = "g1", Skills = ["C#", "TypeScript"] }],
            },
        ],
        Theme = Theme.Default,
        Version = 3,
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };
}

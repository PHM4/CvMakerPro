namespace CvMakerPro.Domain;

/// <summary>
/// What a user gets when they hit "New CV". Structure but no invented content —
/// prefilled fake achievements are the fastest way to make someone distrust the tool.
/// </summary>
public static class StarterDocument
{
    public static CvDocument Create(string fullName, TimeProvider? clock = null) => new()
    {
        Id = Guid.NewGuid(),
        Title = "Untitled CV",
        Header = new Header
        {
            FullName = fullName,
            Contacts =
            [
                new ContactItem { Id = NewId(), Kind = ContactKind.Email, Value = "" },
                new ContactItem { Id = NewId(), Kind = ContactKind.Phone, Value = "" },
                new ContactItem { Id = NewId(), Kind = ContactKind.Location, Value = "" },
            ],
        },
        Sections =
        [
            new ProseSection
            {
                Id = NewId(),
                Heading = "Profile",
                Body = RichText.Empty,
            },
            new EntrySection
            {
                Id = NewId(),
                Heading = "Experience",
                Entries = [BlankEntry()],
            },
            new EntrySection
            {
                Id = NewId(),
                Heading = "Education",
                Entries = [BlankEntry()],
            },
            new SkillSection
            {
                Id = NewId(),
                Heading = "Skills",
                Groups = [new SkillGroup { Id = NewId(), Label = null, Skills = [] }],
            },
            new EntrySection
            {
                Id = NewId(),
                Heading = "Projects",
                Entries = [],
            },
        ],
        Theme = Theme.Default,
        Version = 1,
        UpdatedAt = (clock ?? TimeProvider.System).GetUtcNow(),
    };

    private static Entry BlankEntry() => new()
    {
        Id = NewId(),
        Title = "",
        Bullets = [RichText.Empty],
    };

    private static string NewId() => Guid.NewGuid().ToString("n")[..12];
}

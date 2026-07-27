using CvMakerPro.Domain;
using CvMakerPro.Domain.Ats;

namespace CvMakerPro.Domain.Tests;

public class KeywordAnalyserTests
{
    private const string Posting = """
        We are looking for a backend engineer with strong Kubernetes experience.
        You will work with Kubernetes, Terraform and PostgreSQL. Kubernetes is central
        to the role. Familiarity with C# is a plus.
        """;

    [Fact]
    public void Terms_the_cv_uses_are_reported_as_matched()
    {
        var report = KeywordAnalyser.Analyse(CvWith("Built services on Terraform and PostgreSQL."), Posting);

        Assert.Contains(report.Matched, match => match.Term.Equals("terraform", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(report.Matched, match => match.Term.Equals("postgresql", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Terms_the_cv_never_uses_are_reported_as_missing()
    {
        var report = KeywordAnalyser.Analyse(CvWith("Built services on Terraform and PostgreSQL."), Posting);

        Assert.Contains(report.Missing, match => match.Term.Equals("kubernetes", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void A_repeated_term_outweighs_a_term_mentioned_once()
    {
        var report = KeywordAnalyser.Analyse(CvWith(""), Posting);
        var all = report.Matched.Concat(report.Missing).ToList();

        var kubernetes = all.Single(match => match.Term.Equals("kubernetes", StringComparison.OrdinalIgnoreCase));
        var terraform = all.Single(match => match.Term.Equals("terraform", StringComparison.OrdinalIgnoreCase));

        Assert.Equal(3, kubernetes.JobMentions);
        Assert.True(kubernetes.JobMentions > terraform.JobMentions);
    }

    [Fact]
    public void Csharp_survives_normalisation()
    {
        // "C#" reduced to "C" would collide with C, and the report would claim a match the CV
        // never made. The trailing-punctuation trim has to leave # and + alone.
        var report = KeywordAnalyser.Analyse(CvWith("Ten years of C# on payment systems."), Posting);

        Assert.Contains(report.Matched, match => match.Term == "C#");
    }

    [Fact]
    public void Filler_words_do_not_become_keywords()
    {
        var report = KeywordAnalyser.Analyse(CvWith(""), Posting);
        var all = report.Matched.Concat(report.Missing).Select(match => match.Term).ToList();

        Assert.DoesNotContain("experience", all, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("strong", all, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("with", all, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Hidden_sections_do_not_count_as_coverage()
    {
        // Hiding a section is how a user tailors a CV. A keyword that is no longer printed must
        // not still be credited, or the report describes a document nobody will read.
        var visible = KeywordAnalyser.Analyse(CvWith("Kubernetes at scale."), Posting);
        var hidden = KeywordAnalyser.Analyse(CvWith("Kubernetes at scale.", hidden: true), Posting);

        Assert.Contains(visible.Matched, match => match.Term.Equals("kubernetes", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(hidden.Missing, match => match.Term.Equals("kubernetes", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("is")]
    [InlineData("essential")]
    [InlineData("background")]
    [InlineData("required")]
    [InlineData("senior")]
    [InlineData("engineer")]
    public void Job_advert_filler_does_not_become_a_keyword(string filler)
    {
        // These are the highest-frequency words in almost any posting. Left in, they dominate the
        // weighting and push the actual technologies out of the report — and the user is shown a
        // chip telling them their CV is missing the word "is".
        const string posting = """
            Senior Platform Engineer. Kubernetes experience is essential and a strong PostgreSQL
            background is required. Terraform is essential too.
            """;

        var report = KeywordAnalyser.Analyse(CvWith(""), posting);
        var all = report.Matched.Concat(report.Missing).Select(match => match.Term);

        Assert.DoesNotContain(filler, all, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void The_real_technologies_still_rank_above_the_noise()
    {
        const string posting = """
            Senior Platform Engineer. Kubernetes experience is essential and a strong PostgreSQL
            background is required. Terraform is essential too.
            """;

        var report = KeywordAnalyser.Analyse(CvWith(""), posting);
        var terms = report.Matched.Concat(report.Missing).Select(match => match.Term).ToList();

        Assert.Contains("Kubernetes", terms, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("PostgreSQL", terms, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Terraform", terms, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void Coverage_is_one_when_there_is_nothing_to_match()
    {
        var report = KeywordAnalyser.Analyse(CvWith("anything"), "");

        Assert.Equal(1, report.Coverage);
        Assert.Empty(report.Missing);
    }

    [Fact]
    public void Coverage_rises_as_the_cv_picks_up_the_postings_terms()
    {
        var bare = KeywordAnalyser.Analyse(CvWith(""), Posting).Coverage;
        var better = KeywordAnalyser.Analyse(CvWith("Kubernetes, Terraform and PostgreSQL in C#."), Posting).Coverage;

        Assert.True(better > bare);
        Assert.InRange(better, 0, 1);
    }

    private static CvDocument CvWith(string bullet, bool hidden = false) => new()
    {
        Id = Guid.Empty,
        Title = "Test",
        Header = new Header { FullName = "Ada Lovelace" },
        Sections =
        [
            new EntrySection
            {
                Id = "s1",
                Heading = "Experience",
                Hidden = hidden,
                Entries =
                [
                    new Entry
                    {
                        Id = "e1",
                        Title = "Engineer",
                        Bullets = bullet == "" ? [] : [RichText.Plain(bullet)],
                    },
                ],
            },
        ],
        Theme = Theme.Default,
        Version = 1,
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };
}

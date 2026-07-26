using System.Text.RegularExpressions;

namespace CvMakerPro.Domain.Ats;

public sealed record KeywordMatch(string Term, int JobMentions, bool PresentInCv);

public sealed record KeywordReport
{
    public required IReadOnlyList<KeywordMatch> Matched { get; init; }

    /// <summary>Terms the posting leans on that the CV never says. The actionable half of the report.</summary>
    public required IReadOnlyList<KeywordMatch> Missing { get; init; }

    /// <summary>Share of weighted job terms the CV covers, 0–1.</summary>
    public required double Coverage { get; init; }
}

/// <summary>
/// Compares a CV against a job posting and reports which of the posting's terms are absent.
///
/// This deliberately does not call a model. It is exact term matching over two pieces of text —
/// a language model would produce a slower, more expensive, less repeatable version of an
/// answer that is fully determined by the input, and it would occasionally invent a keyword
/// that appears in neither document. Keeping it local also means it runs on every keystroke.
/// </summary>
public static partial class KeywordAnalyser
{
    /// <summary>
    /// Words too common to be evidence of anything. Deliberately short: an aggressive stop list
    /// starts eating real terms ("C", "R", "Go" are all languages and all look like noise).
    /// </summary>
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "and", "for", "with", "you", "your", "our", "will", "are", "have", "has", "this",
        "that", "from", "will", "who", "all", "any", "can", "may", "not", "but", "their", "them",
        "they", "its", "was", "were", "been", "being", "more", "most", "such", "than", "then",
        "into", "over", "also", "about", "across", "within", "while", "when", "where", "what",
        "role", "team", "work", "working", "job", "candidate", "applicants", "apply", "years",
        "experience", "strong", "excellent", "good", "great", "ability", "able", "skills", "skill",
        "knowledge", "understanding", "familiar", "familiarity", "plus", "bonus", "nice", "must",
        "should", "would", "could", "well", "help", "helping", "using", "use", "used", "new",
        "other", "others", "including", "include", "includes", "etc", "per", "via", "out", "off",
    };

    [GeneratedRegex(@"[A-Za-z][A-Za-z0-9+#.\-]*", RegexOptions.Compiled)]
    private static partial Regex Term();

    public static KeywordReport Analyse(CvDocument document, string jobDescription, int maxTerms = 30)
    {
        var cvTerms = TermsIn(CvText(document));

        // Weighed from the raw token stream, not the deduplicated set — the whole point of the
        // weight is how often the posting repeats a term, and a set would flatten every count to 1.
        var jobTerms = Weigh(TokensIn(jobDescription));

        var ranked = jobTerms
            .OrderByDescending(pair => pair.Value)
            .ThenBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase)
            .Take(maxTerms)
            .Select(pair => new KeywordMatch(pair.Key, pair.Value, cvTerms.Contains(pair.Key)))
            .ToList();

        var totalWeight = ranked.Sum(match => match.JobMentions);
        var coveredWeight = ranked.Where(match => match.PresentInCv).Sum(match => match.JobMentions);

        return new KeywordReport
        {
            Matched = ranked.Where(match => match.PresentInCv).ToList(),
            Missing = ranked.Where(match => !match.PresentInCv).ToList(),
            Coverage = totalWeight == 0 ? 1 : (double)coveredWeight / totalWeight,
        };
    }

    /// <summary>Every word the CV actually prints, hidden sections excluded — they are not on the page.</summary>
    private static string CvText(CvDocument document)
    {
        var parts = new List<string> { document.Header.FullName, document.Header.Headline ?? "" };

        foreach (var section in document.VisibleSections)
        {
            parts.Add(section.Heading);

            switch (section)
            {
                case EntrySection entries:
                    foreach (var entry in entries.Entries)
                    {
                        parts.Add(entry.Title);
                        parts.Add(entry.Organisation ?? "");
                        parts.AddRange(entry.Tags);
                        parts.AddRange(entry.Bullets.Select(bullet => bullet.ToPlainText()));
                    }

                    break;

                case SkillSection skills:
                    foreach (var group in skills.Groups)
                    {
                        parts.Add(group.Label ?? "");
                        parts.AddRange(group.Skills);
                    }

                    break;

                case ProseSection prose:
                    parts.Add(prose.Body.ToPlainText());
                    break;
            }
        }

        return string.Join(' ', parts);
    }

    private static IEnumerable<string> TokensIn(string text) =>
        Term()
            .Matches(text)
            .Select(match => Normalise(match.Value))
            .Where(term => term.Length > 1 && !StopWords.Contains(term));

    private static HashSet<string> TermsIn(string text) =>
        TokensIn(text).ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static Dictionary<string, int> Weigh(IEnumerable<string> terms)
    {
        var weights = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var term in terms)
        {
            weights[term] = weights.GetValueOrDefault(term) + 1;
        }

        return weights;
    }

    /// <summary>
    /// Trims trailing punctuation but keeps <c>+</c> and <c>#</c>, which are part of the name in
    /// C++ and C#. Stripping them turns two distinct languages into the same letter.
    /// </summary>
    private static string Normalise(string term) => term.TrimEnd('.', '-');
}

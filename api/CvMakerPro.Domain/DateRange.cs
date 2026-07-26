using System.Text.Json.Serialization;

namespace CvMakerPro.Domain;

/// <summary>
/// A month-precision span. Day precision is noise on a CV, and storing a full
/// <see cref="DateTime"/> would invite timezone bugs into something that is really
/// just two integers.
/// </summary>
public sealed record DateRange
{
    public required YearMonth Start { get; init; }

    /// <summary>Null means the entry is ongoing — templates render this as "Present".</summary>
    public YearMonth? End { get; init; }

    [JsonIgnore]
    public bool IsOngoing => End is null;
}

public readonly record struct YearMonth(int Year, int Month) : IComparable<YearMonth>
{
    public int CompareTo(YearMonth other)
    {
        var byYear = Year.CompareTo(other.Year);
        return byYear != 0 ? byYear : Month.CompareTo(other.Month);
    }

    public static bool operator <(YearMonth a, YearMonth b) => a.CompareTo(b) < 0;
    public static bool operator >(YearMonth a, YearMonth b) => a.CompareTo(b) > 0;
    public static bool operator <=(YearMonth a, YearMonth b) => a.CompareTo(b) <= 0;
    public static bool operator >=(YearMonth a, YearMonth b) => a.CompareTo(b) >= 0;
}

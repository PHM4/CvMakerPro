using System.Collections;
using System.Runtime.CompilerServices;

namespace CvMakerPro.Domain;

/// <summary>
/// A list with structural equality. The document model is records the whole way down,
/// so <c>==</c> reads like value comparison — but a record holding an
/// <see cref="IReadOnlyList{T}"/> compares that member by reference, and two identical
/// documents come out unequal. Autosave dirty-checking and version diffing both hang
/// off document equality, so the collections have to mean it.
/// </summary>
[CollectionBuilder(typeof(EquatableArray), nameof(EquatableArray.Create))]
public readonly struct EquatableArray<T> : IReadOnlyList<T>, IEquatable<EquatableArray<T>>
    where T : IEquatable<T>
{
    private readonly T[]? _items;

    public EquatableArray(T[] items) => _items = items;

    private T[] Items => _items ?? [];

    public T this[int index] => Items[index];

    public int Count => Items.Length;

    public bool Equals(EquatableArray<T> other) =>
        Items.AsSpan().SequenceEqual(other.Items.AsSpan());

    public override bool Equals(object? obj) => obj is EquatableArray<T> other && Equals(other);

    public override int GetHashCode()
    {
        var hash = new HashCode();
        foreach (var item in Items)
        {
            hash.Add(item);
        }

        return hash.ToHashCode();
    }

    public IEnumerator<T> GetEnumerator() => ((IEnumerable<T>)Items).GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => Items.GetEnumerator();

    public T[] ToArray() => Items[..];

    public static bool operator ==(EquatableArray<T> left, EquatableArray<T> right) => left.Equals(right);

    public static bool operator !=(EquatableArray<T> left, EquatableArray<T> right) => !left.Equals(right);

    public static implicit operator EquatableArray<T>(T[] items) => new(items);
}

public static class EquatableArray
{
    public static EquatableArray<T> Create<T>(ReadOnlySpan<T> items)
        where T : IEquatable<T> => new(items.ToArray());
}

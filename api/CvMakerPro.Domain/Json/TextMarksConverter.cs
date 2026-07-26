using System.Text.Json;
using System.Text.Json.Serialization;

namespace CvMakerPro.Domain.Json;

/// <summary>
/// Writes <see cref="TextMarks"/> as <c>["bold","italic"]</c>. The stock flags converter
/// emits <c>"Bold, Italic"</c>, which every consumer then has to split by hand.
/// </summary>
public sealed class TextMarksConverter : JsonConverter<TextMarks>
{
    private static readonly (TextMarks Flag, string Name)[] Names =
    [
        (TextMarks.Bold, "bold"),
        (TextMarks.Italic, "italic"),
        (TextMarks.Code, "code"),
        (TextMarks.Link, "link"),
    ];

    public override TextMarks Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartArray)
        {
            throw new JsonException($"Expected an array of marks, got {reader.TokenType}.");
        }

        var marks = TextMarks.None;
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException($"Expected a mark name, got {reader.TokenType}.");
            }

            var name = reader.GetString();
            var match = Array.Find(Names, entry => string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase));
            if (match.Flag == TextMarks.None)
            {
                throw new JsonException($"Unknown text mark '{name}'.");
            }

            marks |= match.Flag;
        }

        return marks;
    }

    public override void Write(Utf8JsonWriter writer, TextMarks value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var (flag, name) in Names)
        {
            if (value.HasFlag(flag))
            {
                writer.WriteStringValue(name);
            }
        }

        writer.WriteEndArray();
    }
}

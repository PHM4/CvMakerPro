using System.Text.Json;
using System.Text.Json.Serialization;

namespace CvMakerPro.Domain.Json;

/// <summary>
/// One set of options for every path a document takes — HTTP, the database column,
/// and the render service. They have to agree or a document changes shape in transit.
/// </summary>
public static class CvJson
{
    public static readonly JsonSerializerOptions Options = Configure(new JsonSerializerOptions());

    public static JsonSerializerOptions Configure(JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        // Order matters: JsonStringEnumConverter is a factory that claims every enum,
        // so the TextMarks converter has to be ahead of it to get a look in.
        options.Converters.Add(new EquatableArrayConverterFactory());
        options.Converters.Add(new TextMarksConverter());
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        return options;
    }

    public static string Serialize(CvDocument document) =>
        JsonSerializer.Serialize(document, Options);

    public static CvDocument Deserialize(string json) =>
        JsonSerializer.Deserialize<CvDocument>(json, Options)
        ?? throw new JsonException("Document payload was null.");
}

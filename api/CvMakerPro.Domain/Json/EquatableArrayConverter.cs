using System.Text.Json;
using System.Text.Json.Serialization;

namespace CvMakerPro.Domain.Json;

/// <summary>
/// Keeps <see cref="EquatableArray{T}"/> on the wire as a plain JSON array. Without this
/// it serialises as a struct with an <c>items</c> property and the contract leaks an
/// implementation detail the TypeScript side has no reason to know about.
/// </summary>
public sealed class EquatableArrayConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType
        && typeToConvert.GetGenericTypeDefinition() == typeof(EquatableArray<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var elementType = typeToConvert.GetGenericArguments()[0];
        var converterType = typeof(EquatableArrayConverter<>).MakeGenericType(elementType);
        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }

    private sealed class EquatableArrayConverter<T> : JsonConverter<EquatableArray<T>>
        where T : IEquatable<T>
    {
        public override EquatableArray<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
            new(JsonSerializer.Deserialize<T[]>(ref reader, options) ?? []);

        public override void Write(Utf8JsonWriter writer, EquatableArray<T> value, JsonSerializerOptions options) =>
            JsonSerializer.Serialize(writer, value.ToArray(), options);
    }
}

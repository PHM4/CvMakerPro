using System.Text.Json;
using CvMakerPro.Domain;
using CvMakerPro.Domain.Json;

namespace CvMakerPro.Domain.Tests;

public class CvJsonTests
{
    [Fact]
    public void Starter_document_survives_a_round_trip()
    {
        var original = StarterDocument.Create("Ada Lovelace");

        var restored = CvJson.Deserialize(CvJson.Serialize(original));

        Assert.Equal(original, restored);
    }

    [Fact]
    public void Section_subtypes_are_restored_from_their_discriminator()
    {
        var document = StarterDocument.Create("Ada Lovelace");

        var restored = CvJson.Deserialize(CvJson.Serialize(document));

        Assert.Collection(
            restored.Sections,
            section => Assert.IsType<ProseSection>(section),
            section => Assert.IsType<EntrySection>(section),
            section => Assert.IsType<EntrySection>(section),
            section => Assert.IsType<SkillSection>(section),
            section => Assert.IsType<EntrySection>(section));
    }

    [Fact]
    public void Text_marks_serialise_as_an_array_of_names()
    {
        var run = new TextRun { Text = "shipped", Marks = TextMarks.Bold | TextMarks.Italic };

        var json = JsonSerializer.Serialize(run, CvJson.Options);

        Assert.Contains("\"marks\":[\"bold\",\"italic\"]", json);
    }

    [Fact]
    public void Text_marks_round_trip_through_their_array_form()
    {
        var run = new TextRun { Text = "shipped", Marks = TextMarks.Code | TextMarks.Link, Href = new Uri("https://example.com") };

        var restored = JsonSerializer.Deserialize<TextRun>(JsonSerializer.Serialize(run, CvJson.Options), CvJson.Options);

        Assert.Equal(run, restored);
    }

    [Fact]
    public void Unknown_marks_are_rejected_rather_than_silently_dropped()
    {
        const string json = """{"text":"x","marks":["bold","blink"]}""";

        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<TextRun>(json, CvJson.Options));
    }
}

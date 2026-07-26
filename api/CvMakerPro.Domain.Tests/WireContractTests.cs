using System.Text.Json;
using CvMakerPro.Domain;
using CvMakerPro.Domain.Json;

namespace CvMakerPro.Domain.Tests;

/// <summary>
/// The TypeScript model is a hand-written mirror of these types until the OpenAPI
/// generator lands, so the wire shape is a contract two codebases depend on.
/// A convenience getter added to the domain must not silently become a JSON field.
/// </summary>
public class WireContractTests
{
    [Fact]
    public void Computed_properties_stay_out_of_the_payload()
    {
        var json = CvJson.Serialize(StarterDocument.Create("Ada Lovelace"));

        Assert.DoesNotContain("visibleSections", json);
        Assert.DoesNotContain("isEmpty", json);
        Assert.DoesNotContain("isOngoing", json);
        Assert.DoesNotContain("contentWidthMm", json);
        Assert.DoesNotContain("contentHeightMm", json);
    }

    [Fact]
    public void Collections_are_plain_json_arrays()
    {
        var json = CvJson.Serialize(StarterDocument.Create("Ada Lovelace"));

        using var document = JsonDocument.Parse(json);
        var sections = document.RootElement.GetProperty("sections");

        Assert.Equal(JsonValueKind.Array, sections.ValueKind);
        Assert.Equal(JsonValueKind.Array, document.RootElement.GetProperty("header").GetProperty("contacts").ValueKind);
    }

    [Fact]
    public void Enums_are_camel_case_strings()
    {
        var json = CvJson.Serialize(StarterDocument.Create("Ada Lovelace"));

        Assert.Contains("\"kind\":\"email\"", json);
        Assert.Contains("\"density\":\"normal\"", json);
    }

    [Fact]
    public void Section_discriminator_is_the_kind_property()
    {
        var json = CvJson.Serialize(StarterDocument.Create("Ada Lovelace"));

        using var document = JsonDocument.Parse(json);
        var kinds = document.RootElement
            .GetProperty("sections")
            .EnumerateArray()
            .Select(section => section.GetProperty("kind").GetString())
            .ToArray();

        Assert.Equal(["prose", "entries", "entries", "skills", "entries"], kinds);
    }

    [Fact]
    public void Nulls_are_omitted_rather_than_written()
    {
        var json = CvJson.Serialize(StarterDocument.Create("Ada Lovelace"));

        Assert.DoesNotContain("\"headline\":null", json);
        Assert.DoesNotContain("\"dates\":null", json);
    }
}

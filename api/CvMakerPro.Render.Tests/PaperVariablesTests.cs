using CvMakerPro.Domain;
using CvMakerPro.Render;

namespace CvMakerPro.Render.Tests;

/// <summary>
/// The other half of this test is web/src/preview/paperStyles.test.ts, which asserts the
/// same two strings. The browser and this service each build these variables from their
/// own copy of the logic, so that no stylesheet text has to cross the wire; these goldens
/// are what keep the copies honest.
///
/// If you change the output, change it in both places and update both goldens.
/// </summary>
public class PaperVariablesTests
{
    private const string A4Expected = """

        :root {
          --page-width: 210mm;
          --page-height: 297mm;
          --page-margin-top: 18mm;
          --page-margin-right: 16mm;
          --page-margin-bottom: 18mm;
          --page-margin-left: 16mm;
          --page-content-width: 178mm;
          --page-content-height: 261mm;
          --doc-accent: #7a2718;
          --doc-font: 'Source Serif 4 Variable';
          --font-scale: 1.05;
          --density: 0.78;
        }

        @page {
          size: 210mm 297mm;
          margin: 0;
        }

        """;

    private const string LetterExpected = """

        :root {
          --page-width: 215.9mm;
          --page-height: 279.4mm;
          --page-margin-top: 18mm;
          --page-margin-right: 16mm;
          --page-margin-bottom: 18mm;
          --page-margin-left: 16mm;
          --page-content-width: 183.9mm;
          --page-content-height: 243.4mm;
          --doc-accent: #16150f;
          --doc-font: 'Instrument Sans Variable';
          --font-scale: 1;
          --density: 1;
        }

        @page {
          size: 215.9mm 279.4mm;
          margin: 0;
        }

        """;

    private static readonly Theme A4Theme = new()
    {
        TemplateId = "sable",
        AccentColor = "#7a2718",
        FontFamily = "Source Serif 4 Variable",
        FontScale = 1.05,
        Density = Density.Compact,
        Page = PageGeometry.A4,
    };

    [Fact]
    public void Matches_the_golden_for_A4()
    {
        Assert.Equal(A4Expected, PaperVariables.Build(A4Theme));
    }

    [Fact]
    public void Matches_the_golden_for_US_Letter()
    {
        var theme = A4Theme with
        {
            AccentColor = "#16150f",
            FontFamily = "Instrument Sans Variable",
            FontScale = 1,
            Density = Density.Normal,
            Page = PageGeometry.Letter,
        };

        Assert.Equal(LetterExpected, PaperVariables.Build(theme));
    }

    [Theory]
    [InlineData("red")]
    [InlineData("#fff")]
    [InlineData("#000; } body { display: none } .x {")]
    [InlineData("")]
    public void A_colour_that_is_not_a_six_digit_hex_falls_back(string accent)
    {
        var css = PaperVariables.Build(A4Theme with { AccentColor = accent });

        Assert.Contains("--doc-accent: #16150f;", css);
        Assert.DoesNotContain("display: none", css);
    }

    [Theory]
    [InlineData("Comic Sans MS", "Comic Sans MS")]
    [InlineData("Source Serif'; } body {", "Source Serif  body")]
    [InlineData("", "Source Serif 4 Variable")]
    public void A_font_family_is_reduced_to_a_name(string family, string expected)
    {
        var css = PaperVariables.Build(A4Theme with { FontFamily = family });

        Assert.Contains($"--doc-font: '{expected}';", css);
    }
}

using CvMakerPro.Render;

namespace CvMakerPro.Render.Tests;

public class HtmlSanitiserTests
{
    private readonly HtmlSanitiser _sanitiser = new();

    [Fact]
    public void Template_markup_passes_through_unchanged()
    {
        const string html =
            """<div class="paper-page sable"><h1 class="sable-name">Rowan Whitaker</h1><p class="sable-bullet">Cut <strong>deploy time</strong> to four minutes.</p></div>""";

        Assert.Equal(html, _sanitiser.Sanitise(html));
    }

    [Fact]
    public void Script_elements_are_removed_with_their_contents()
    {
        var result = _sanitiser.Sanitise("<div>before<script>fetch('https://evil.example')</script>after</div>");

        Assert.Equal("<div>beforeafter</div>", result);
        Assert.DoesNotContain("fetch", result);
    }

    [Fact]
    public void Style_elements_are_removed_so_the_printer_keeps_its_own_stylesheet()
    {
        var result = _sanitiser.Sanitise("<div><style>.sable { display: none }</style>text</div>");

        Assert.Equal("<div>text</div>", result);
    }

    [Theory]
    [InlineData("<iframe src=\"https://evil.example\"></iframe>")]
    [InlineData("<object data=\"x\"></object>")]
    [InlineData("<embed src=\"x\">")]
    public void Embedding_elements_are_removed(string html)
    {
        Assert.Equal(string.Empty, _sanitiser.Sanitise($"<div>{html}</div>").Replace("<div>", "").Replace("</div>", ""));
    }

    [Fact]
    public void An_unknown_element_is_unwrapped_rather_than_dropped()
    {
        // Losing a wrapper is recoverable. Losing the employment history inside it is not.
        var result = _sanitiser.Sanitise("<div><marquee>Senior Engineer</marquee></div>");

        Assert.Equal("<div>Senior Engineer</div>", result);
    }

    [Fact]
    public void Event_handler_attributes_are_stripped()
    {
        var result = _sanitiser.Sanitise("""<div onclick="steal()" onmouseover="x()">text</div>""");

        Assert.Equal("<div>text</div>", result);
    }

    [Fact]
    public void Images_are_removed()
    {
        // Nothing in a template emits one, and an img is a request waiting to happen.
        var result = _sanitiser.Sanitise("""<p><img src="https://tracker.example/p.gif">text</p>""");

        Assert.Equal("<p>text</p>", result);
    }

    [Fact]
    public void The_paginator_inline_margin_survives()
    {
        const string html = """<div class="paper-block" style="margin-top: 4.6mm">x</div>""";

        Assert.Contains("margin-top: 4.6mm", _sanitiser.Sanitise(html));
    }

    [Theory]
    [InlineData("position: fixed")]
    [InlineData("margin-top: 4.6mm; background: url(https://evil.example/x)")]
    [InlineData("margin-top: 10px")]
    [InlineData("margin-top: expression(alert(1))")]
    public void Any_other_inline_style_is_dropped(string style)
    {
        var result = _sanitiser.Sanitise($"""<div style="{style}">x</div>""");

        Assert.Equal("<div>x</div>", result);
    }

    [Theory]
    [InlineData("https://example.com")]
    [InlineData("mailto:rowan@example.com")]
    [InlineData("tel:+447700900412")]
    public void Ordinary_link_targets_are_kept(string href)
    {
        var result = _sanitiser.Sanitise($"""<a href="{href}">link</a>""");

        Assert.Contains($"href=\"{href}\"", result);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("file:///etc/passwd")]
    [InlineData("vbscript:msgbox(1)")]
    public void Other_link_schemes_are_dropped(string href)
    {
        var result = _sanitiser.Sanitise($"""<a href="{href}">link</a>""");

        Assert.DoesNotContain("href", result);
        Assert.Contains("link", result);
    }

    [Fact]
    public void Kept_links_are_given_noopener()
    {
        var result = _sanitiser.Sanitise("""<a href="https://example.com">link</a>""");

        Assert.Contains("noopener noreferrer", result);
    }

    [Fact]
    public void Nested_disallowed_content_is_cleaned_at_every_depth()
    {
        var result = _sanitiser.Sanitise(
            """<div class="paper-page"><section><p onclick="x()">a<span><script>b</script>c</span></p></section></div>""");

        Assert.DoesNotContain("script", result);
        Assert.DoesNotContain("onclick", result);
        // The script goes; the text on either side of it, at every depth, stays.
        Assert.Equal("""<div class="paper-page"><section><p>a<span>c</span></p></section></div>""", result);
    }

    [Fact]
    public void Deeply_nested_markup_does_not_stack_overflow()
    {
        var html = string.Concat(Enumerable.Repeat("<div>", 400))
            + "text"
            + string.Concat(Enumerable.Repeat("</div>", 400));

        Assert.Contains("text", _sanitiser.Sanitise(html));
    }
}

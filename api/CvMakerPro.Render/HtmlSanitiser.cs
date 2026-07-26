using System.Text.RegularExpressions;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace CvMakerPro.Render;

/// <summary>
/// Reduces posted markup to the small set of elements a CV template can produce.
///
/// The export pipeline takes HTML from the browser so that the printed page is the page
/// the user approved. That is the right trade for fidelity, and it means the printer is
/// rendering a payload the caller controls — so this runs first and works from an
/// allowlist. Anything not named here is dropped, including things nobody has thought of.
///
/// This is the second of three defences, not the only one. The printer also runs with
/// JavaScript disabled and every network request aborted, so even a bypass here has
/// nothing to reach.
/// </summary>
public sealed partial class HtmlSanitiser
{
    private static readonly HashSet<string> AllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "div", "section", "article", "header", "p", "span", "h1", "h2", "h3",
        "ul", "ol", "li", "strong", "em", "code", "a", "br",
    };

    /// <summary>
    /// Templates carry their own class names, so classes pass through. They select styles
    /// from a stylesheet this service owns; the worst a made-up class can do is nothing.
    /// </summary>
    private static readonly HashSet<string> AllowedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "class", "href", "rel", "data-block-key",
    };

    /// <summary>
    /// The paginator writes the space above each block as an inline margin, so a narrow
    /// style attribute has to survive. Exactly one declaration, exactly one unit — not a
    /// general CSS parser, which is the point.
    /// </summary>
    [GeneratedRegex(@"^\s*margin-top:\s*\d{1,3}(\.\d{1,4})?mm\s*;?\s*$", RegexOptions.IgnoreCase)]
    private static partial Regex AllowedInlineStyle();

    [GeneratedRegex(@"^(https?://|mailto:|tel:)", RegexOptions.IgnoreCase)]
    private static partial Regex AllowedHref();

    private readonly HtmlParser _parser = new();

    public string Sanitise(string html)
    {
        var document = _parser.ParseDocument($"<!doctype html><html><body>{html}</body></html>");
        var body = document.Body ?? throw new InvalidOperationException("Parsed document has no body.");

        Clean(body);

        return body.InnerHtml;
    }

    private void Clean(IElement element)
    {
        // Snapshot first: the loop reparents and removes nodes, and AngleSharp's live
        // collections would skip siblings if walked directly.
        foreach (var child in element.Children.ToArray())
        {
            if (!AllowedTags.Contains(child.LocalName))
            {
                /*
                 * Unwrap rather than delete. A disallowed wrapper around allowed content
                 * is far more likely to be a template doing something new than an attack,
                 * and silently dropping the user's employment history to be safe is its
                 * own kind of failure. Script and style are the exception: their content
                 * is code, not text, and it goes with them.
                 */
                if (child.LocalName is "script" or "style" or "iframe" or "object" or "embed" or "svg")
                {
                    child.Remove();
                }
                else
                {
                    Unwrap(child);
                }

                continue;
            }

            CleanAttributes(child);
            Clean(child);
        }
    }

    private static void Unwrap(IElement element)
    {
        var parent = element.Parent;
        if (parent is null)
        {
            element.Remove();
            return;
        }

        foreach (var node in element.ChildNodes.ToArray())
        {
            parent.InsertBefore(node, element);
        }

        element.Remove();
    }

    private static void CleanAttributes(IElement element)
    {
        foreach (var attribute in element.Attributes.ToArray())
        {
            var name = attribute.Name;

            if (!AllowedAttributes.Contains(name) && name != "style")
            {
                element.RemoveAttribute(name);
                continue;
            }

            switch (name.ToLowerInvariant())
            {
                case "style" when !AllowedInlineStyle().IsMatch(attribute.Value):
                    element.RemoveAttribute(name);
                    break;

                case "href" when !AllowedHref().IsMatch(attribute.Value):
                    element.RemoveAttribute(name);
                    break;
            }
        }

        // Anchors leave for somewhere else; nothing in a printed CV should be able to
        // reach back into the printing context.
        if (element.LocalName == "a" && element.HasAttribute("href"))
        {
            element.SetAttribute("rel", "noopener noreferrer");
        }
    }
}

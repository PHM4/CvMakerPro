using CvMakerPro.Domain;

namespace CvMakerPro.Render;

/// <summary>
/// What the browser sends to have its preview printed.
///
/// Note what is absent: no stylesheet, no fonts, no page setup. The client sends the
/// markup it rendered and the theme it rendered it with, and the service supplies
/// everything else from its own assets. That keeps the request small and keeps the
/// printer's stylesheet out of the caller's hands.
/// </summary>
public sealed record RenderRequest
{
    public required string TemplateId { get; init; }

    /// <summary>The serialised contents of the preview iframe's body, sanitised before use.</summary>
    public required string BodyHtml { get; init; }

    public required Theme Theme { get; init; }

    /// <summary>Becomes the PDF's document title, which is what most viewers show in the tab.</summary>
    public required string DocumentTitle { get; init; }
}

using System.Collections.Concurrent;

namespace CvMakerPro.Render;

/// <summary>
/// Serves the composed stylesheets written by web/scripts/build-render-assets.mjs.
///
/// These files are generated from the same sources the browser preview imports, which is
/// the only reason the printed page can be trusted to match. They are checked in rather
/// than built here so a deployment of this service cannot drift from the front end that
/// was released with it.
/// </summary>
public sealed class TemplateAssets
{
    private readonly string _root;
    private readonly ConcurrentDictionary<string, string> _cache = new();

    public TemplateAssets(string? root = null)
    {
        _root = root ?? Path.Combine(AppContext.BaseDirectory, "Assets", "templates");
    }

    public bool Exists(string templateId) => File.Exists(PathFor(templateId));

    public string Stylesheet(string templateId) =>
        _cache.GetOrAdd(templateId, id =>
        {
            var path = PathFor(id);
            if (!File.Exists(path))
            {
                throw new UnknownTemplateException(id);
            }

            return File.ReadAllText(path);
        });

    private string PathFor(string templateId)
    {
        // The id reaches this service from a request body and ends up in a file path.
        if (!templateId.All(c => char.IsAsciiLetterOrDigit(c) || c == '-'))
        {
            throw new UnknownTemplateException(templateId);
        }

        return Path.Combine(_root, $"{templateId}.css");
    }
}

public sealed class UnknownTemplateException(string templateId)
    : Exception($"No stylesheet for template '{templateId}'.")
{
    public string TemplateId { get; } = templateId;
}

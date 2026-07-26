using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using CvMakerPro.Domain;
using CvMakerPro.Domain.Ats;

namespace CvMakerPro.Api.Assist;

public sealed record BulletRequest(string Text, string? Role, string? Organisation);

public sealed record BulletSuggestion(string Text, string Approach);

public sealed record BulletResponse(string Assessment, IReadOnlyList<BulletSuggestion> Suggestions, IReadOnlyList<string> Needs);

public sealed record TailorRequest(CvDocument Document, string JobDescription);

public sealed record TailorSuggestion(string Where, string Change, string Why);

public sealed record TailorResponse(
    string Summary,
    IReadOnlyList<TailorSuggestion> Suggestions,
    IReadOnlyList<string> Gaps,
    KeywordReport Keywords);

/// <summary>
/// The writing assistant.
///
/// Everything here goes through the server so the API key never reaches the browser. That is the
/// only reason this is a backend concern at all — the calls themselves are stateless.
/// </summary>
public sealed class AssistService(AnthropicClient client)
{
    private const string Model = "claude-opus-4-8";

    public async Task<BulletResponse> RewriteBulletAsync(BulletRequest request, CancellationToken ct)
    {
        var context = string.Join(' ', new[]
        {
            request.Role is null ? null : $"The bullet belongs to the role \"{request.Role}\".",
            request.Organisation is null ? null : $"At {request.Organisation}.",
        }.Where(part => part is not null));

        var message = await client.Messages.Create(new MessageCreateParams
        {
            Model = Model,
            MaxTokens = 2000,
            System = AssistPrompts.Bullet,
            // Rewriting one sentence is not a reasoning problem, and this call sits in front of a
            // user waiting on a button. Low effort keeps it responsive; the constraints that matter
            // are in the prompt, not in how long the model deliberates.
            OutputConfig = new OutputConfig
            {
                Effort = Effort.Low,
                Format = new JsonOutputFormat { Schema = BulletSchema },
            },
            Messages =
            [
                new()
                {
                    Role = Role.User,
                    Content = $"{context}\n\nThe bullet:\n{request.Text}",
                },
            ],
        }, cancellationToken: ct);

        return Parse<BulletResponse>(message);
    }

    public async Task<TailorResponse> TailorAsync(TailorRequest request, CancellationToken ct)
    {
        // Computed here rather than asked of the model: term matching is fully determined by the
        // two documents, so a model call would be a slower, costlier way to get a worse answer.
        var keywords = KeywordAnalyser.Analyse(request.Document, request.JobDescription);

        var message = await client.Messages.Create(new MessageCreateParams
        {
            Model = Model,
            MaxTokens = 8000,
            System = AssistPrompts.Tailor,
            // This one is genuinely analytical — read a posting, read a CV, work out what to move.
            Thinking = new ThinkingConfigAdaptive(),
            OutputConfig = new OutputConfig
            {
                Effort = Effort.Medium,
                Format = new JsonOutputFormat { Schema = TailorSchema },
            },
            Messages =
            [
                new()
                {
                    Role = Role.User,
                    Content = $"""
                        The job posting:
                        {request.JobDescription}

                        The CV, as plain text:
                        {PlainText(request.Document)}

                        Terms the posting repeats that the CV never uses:
                        {string.Join(", ", keywords.Missing.Select(match => match.Term))}
                        """,
                },
            ],
        }, cancellationToken: ct);

        var parsed = Parse<TailorResponse>(message);
        return parsed with { Keywords = keywords };
    }

    private static T Parse<T>(Message message)
    {
        var text = message.Content
            .Select(block => block.Value)
            .OfType<TextBlock>()
            .Select(block => block.Text)
            .FirstOrDefault();

        if (string.IsNullOrWhiteSpace(text))
        {
            // A refusal or a token-capped response lands here. It is not an exception the caller
            // can act on, so it is surfaced as one the endpoint can turn into a 502.
            throw new AssistUnavailableException($"The assistant returned no usable text (stop reason: {message.StopReason}).");
        }

        return JsonSerializer.Deserialize<T>(text, JsonOptions)
            ?? throw new AssistUnavailableException("The assistant returned an empty result.");
    }

    private static string PlainText(CvDocument document)
    {
        var lines = new List<string> { document.Header.FullName };
        if (document.Header.Headline is { } headline)
        {
            lines.Add(headline);
        }

        foreach (var section in document.VisibleSections)
        {
            lines.Add($"\n## {section.Heading}");

            switch (section)
            {
                case EntrySection entries:
                    foreach (var entry in entries.Entries)
                    {
                        lines.Add($"{entry.Title}{(entry.Organisation is null ? "" : $", {entry.Organisation}")}");
                        lines.AddRange(entry.Bullets.Select(bullet => $"- {bullet.ToPlainText()}"));
                        if (entry.Tags.Count > 0)
                        {
                            lines.Add($"Tools: {string.Join(", ", entry.Tags)}");
                        }
                    }

                    break;

                case SkillSection skills:
                    lines.AddRange(skills.Groups.Select(group =>
                        $"{group.Label}: {string.Join(", ", group.Skills)}".TrimStart(':', ' ')));
                    break;

                case ProseSection prose:
                    lines.Add(prose.Body.ToPlainText());
                    break;
            }
        }

        return string.Join('\n', lines);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static Dictionary<string, JsonElement> SchemaFrom(string json) =>
        JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)!;

    private static readonly Dictionary<string, JsonElement> BulletSchema = SchemaFrom("""
        {
          "type": "object",
          "properties": {
            "assessment": { "type": "string", "description": "One sentence on what the original does well or badly." },
            "suggestions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "text": { "type": "string" },
                  "approach": { "type": "string", "enum": ["outcome-first", "action-first", "shortest"] }
                },
                "required": ["text", "approach"],
                "additionalProperties": false
              }
            },
            "needs": {
              "type": "array",
              "description": "Figures or details the user would have to supply to make this stronger. Never invented.",
              "items": { "type": "string" }
            }
          },
          "required": ["assessment", "suggestions", "needs"],
          "additionalProperties": false
        }
        """);

    private static readonly Dictionary<string, JsonElement> TailorSchema = SchemaFrom("""
        {
          "type": "object",
          "properties": {
            "summary": { "type": "string", "description": "Two sentences on how well this CV fits this posting." },
            "suggestions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "where": { "type": "string", "description": "The section and entry to change." },
                  "change": { "type": "string" },
                  "why": { "type": "string" }
                },
                "required": ["where", "change", "why"],
                "additionalProperties": false
              }
            },
            "gaps": {
              "type": "array",
              "description": "Requirements the CV genuinely does not evidence. Stated plainly, not worked around.",
              "items": { "type": "string" }
            }
          },
          "required": ["summary", "suggestions", "gaps"],
          "additionalProperties": false
        }
        """);
}

public sealed class AssistUnavailableException(string message) : Exception(message);

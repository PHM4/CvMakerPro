# CvMakerPro

A CV builder where the preview is the PDF.

Most CV tools draw the on-screen preview in HTML and then re-draw the export with a separate PDF
library. Two layout engines, two results — which is why the download never quite matches what you
approved. This one has a single renderer: the preview lays the document out in the browser, and
the export prints *that markup* in headless Chromium using the same stylesheet, the same box
model and the same embedded fonts.

```
web/   React 19 + TypeScript + Vite — editor, pagination, live preview
api/   .NET 8
       CvMakerPro.Domain    the CV document model (the core)
       CvMakerPro.Render    Chromium print pipeline + HTML sanitiser
       CvMakerPro.Api       auth, documents, assistant, serves the SPA
```

## How it fits together

**The document model.** A CV is a typed tree — sections → entries → text runs — not a bag of form
fields. Templates are pure functions of that tree, which is what lets you switch template without
losing data. Text is stored as *runs*, not markup, so the export sanitiser has nothing to
sanitise: every tag in the output is one the template emitted.

**Pagination.** Templates emit a flat list of blocks with break metadata (`keepWithNext`,
`spaceBeforeMm`); one paginator owns page geometry. That split means one set of orphan rules
rather than a different bug per template — a section heading is never stranded at the foot of a
page, and a job title never appears without its first bullet.

**Fidelity.** The preview renders into a sandboxed iframe so the editor's CSS can never reach the
paper. The sheet is a fixed-size padded box and `@page` margin is zero, so screen and print share
one box model. Fonts are inlined as base64 into a stylesheet generated from the same source both
sides consume. Theme variables are *regenerated* server-side from the typed theme rather than
posted as CSS — `PaperVariablesTests.cs` and `paperStyles.test.ts` assert the same two strings
byte-for-byte so the two copies cannot drift.

**Security of the print path.** The client posts markup, so the renderer treats it as hostile:
an allowlist sanitiser (AngleSharp) reduces it to the tags templates produce, then Chromium runs
it with **every network request aborted** and **JavaScript disabled**. Three layers, because
taking the browser's own DOM is what buys the fidelity and it has to be paid for somewhere.

**The assistant.** Keyword/ATS analysis is deliberately *not* a model call — it is exact term
matching over two documents, so a model would be a slower, costlier way to get a less repeatable
answer, and it would occasionally invent a keyword present in neither. The model is reserved for
judgement: rewriting a bullet, and comparing a CV to a posting. Its prompts spend most of their
length refusing to invent figures and avoiding CV boilerplate, and it never applies a suggestion —
every alternative is a button the user presses.

## Running it locally

You need .NET 8 SDK, Node 22+, and Docker (for Postgres).

```bash
docker compose up -d db
```

```bash
cd api && dotnet run --project CvMakerPro.Api
```

```bash
cd web && npm install && npm run build:render-assets && npm run dev
```

Open http://localhost:5173. The editor works signed out, backed by a local draft — accounts add
sync, version history and the assistant.

`npm run build:render-assets` inlines the fonts and writes the composed stylesheets into
`api/CvMakerPro.Render/Assets/`. **Re-run it after editing any template CSS**, or the printed PDF
keeps the previous stylesheet while the preview shows the new one.

### Tests

```bash
cd api && dotnet test
```

```bash
cd web && npm test
```

The .NET suite includes integration tests that print real PDFs with real Chromium and assert page
count, A4/Letter geometry, extracted text, and the embedded font name. They are slow and they need
a browser — that is the point. On first run PuppeteerSharp downloads Chromium.

## Configuration

| Setting | Env var | Notes |
|---|---|---|
| Postgres | `ConnectionStrings__Postgres` | Required. |
| Anthropic key | `Anthropic__ApiKey` or `ANTHROPIC_API_KEY` | Optional — everything except the assistant works without it. |
| Chromium path | `Chromium__ExecutablePath` | Unset locally (PuppeteerSharp fetches one); set in the container. |
| Chromium sandbox | `Chromium__DisableSandbox` | See below. |
| Migrations on boot | `Database__MigrateOnStartup` | Defaults to true. Turn off if you run more than one replica. |

Never commit the API key. `appsettings.Development.json` is gitignored; use
`dotnet user-secrets` or an env var.

### On `Chromium__DisableSandbox`

Docker's default seccomp profile blocks the namespace syscalls Chromium's own sandbox needs, so
the container sets this to `true`. That is a real reduction in isolation and the app logs a
warning on every browser launch so it can't be forgotten. What remains is the layering the render
service was designed around: all network aborted, JavaScript off, markup allowlist-sanitised,
process unprivileged.

To keep the sandbox instead, run with a Chromium-aware seccomp profile
(`--security-opt seccomp=chrome.json`) and set `Chromium__DisableSandbox=false`.

## Deploying

The API serves the built SPA from its own origin. One image, one service, no CORS.

```bash
docker compose up --build
```

That is the whole production shape — app on :8080, Postgres alongside. To verify a build before
deploying anywhere:

```bash
curl -fsS http://localhost:8080/api/health
```

See [DEPLOY.md](DEPLOY.md) for hosting it on Fly.io with a managed database.

## Known limitations

- **Migrations run on startup.** Fine for one instance; race-prone with several. Move to a
  release-phase command before scaling out.
- **The renderer holds one browser.** Concurrent exports share it via fresh pages, which is
  correct but caps throughput. Rate-limited to 20/minute per user.
- **.NET 8 reaches end of support in November 2026.** The code targets `net8.0` only because that
  is the installed SDK; there is nothing version-specific in it. Bump `TargetFramework` and the
  EF/Identity package versions when you upgrade.
- **Rich text is authored through a small inline syntax** (`**bold**`, `*italic*`, `` `code` ``,
  `[text](url)`) rather than a WYSIWYG editor. The model stores runs, so a real editor can be
  added later without migrating any documents.

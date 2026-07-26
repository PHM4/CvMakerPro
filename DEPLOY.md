# Deploying CvMakerPro

The app is a single container: the .NET API serves the built SPA from its own origin. You need one
service and one Postgres database — there is no separate frontend host, no CDN to configure, and
no CORS.

Anything that can run a Dockerfile and reach a Postgres works. Fly.io is written out below because
the Chromium memory requirement makes the free tiers of most alternatives fail in a way that is
annoying to diagnose.

---

## Before you start

You need:

- **A Postgres database.** [Neon](https://neon.tech) and [Supabase](https://supabase.com) both
  have usable free tiers. Fly's own managed Postgres also works.
- **An Anthropic API key** from https://platform.claude.com — optional. Without it every feature
  works except the writing assistant.
- **At least 1 GB of RAM on the app instance.** Chromium is the constraint. On 512 MB it launches,
  renders small documents, then gets OOM-killed partway through a two-page CV — which looks like a
  random export failure rather than a memory problem.

Check the image builds and runs locally first. This catches almost everything:

```bash
docker compose up --build
```

```bash
curl -fsS http://localhost:8080/api/health
```

---

## Fly.io

### 1. Install and sign in

```bash
brew install flyctl
```

```bash
fly auth signup
```

### 2. Create the app without deploying yet

From the repository root:

```bash
fly launch --no-deploy --name cvmakerpro --region lhr
```

Say **no** when it offers to set up Postgres — you are bringing your own. Use `lhr` (London) if
you're applying to UK roles; the region only affects latency.

That writes a `fly.toml`. Open it and make sure the memory and port are right:

```toml
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

`internal_port` must be **8080** — that is what the Dockerfile sets `ASPNETCORE_URLS` to.

`auto_stop_machines = "suspend"` is what keeps this cheap: the machine sleeps when idle and wakes
on a request. First request after a sleep takes a few seconds, and the first *export* after that
takes a few more while Chromium starts. Set `min_machines_running = 1` if you're linking it on a
CV and want it always warm.

### 3. Set the secrets

Get your Postgres connection string and convert it to ADO.NET form. Providers hand you a URL like
`postgres://user:pass@host/dbname`; Npgsql wants:

```
Host=HOST;Database=DBNAME;Username=USER;Password=PASS;SSL Mode=Require;Trust Server Certificate=true
```

`SSL Mode=Require` is not optional for a hosted database — without it the connection is refused
and the error mentions neither SSL nor the fix.

```bash
fly secrets set ConnectionStrings__Postgres='Host=...;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true'
```

```bash
fly secrets set ANTHROPIC_API_KEY='sk-ant-...'
```

Secrets are encrypted and injected as environment variables. Never put either of these in
`fly.toml` — that file is committed.

### 4. Deploy

```bash
fly deploy
```

The build runs the whole Dockerfile remotely: SPA build, font inlining, .NET publish. First deploy
takes several minutes; later ones reuse layers.

### 5. Check it

```bash
fly status
```

```bash
curl -fsS https://cvmakerpro.fly.dev/api/health
```

```bash
fly logs
```

On boot the app applies EF migrations and logs the `CREATE TABLE` statements. Seeing those once is
how you know the database connection worked.

Then open the URL, create an account, and press **Export PDF**. If the PDF downloads and matches
the preview, the whole pipeline is working.

---

## If something is wrong

| Symptom | Cause |
|---|---|
| Boot loop, logs mention Npgsql or a timeout | Connection string wrong, or missing `SSL Mode=Require`. |
| Health check passes, export returns 500 | Read `fly logs`. If it says `Failed to launch browser`, the sandbox flag was overridden — the image sets `Chromium__DisableSandbox=true` and it needs to stay set on a stock runtime. |
| Export works for one page, fails on two | Out of memory. Raise to `1gb` (`fly scale memory 1024`). |
| Assistant returns 502 | `ANTHROPIC_API_KEY` not set, or out of credit. Everything else keeps working. |
| PDF text isn't selectable, or is huge | `npm run build:render-assets` wasn't re-run after a font change, so the stylesheet shipped without the embedded faces. |
| Preview and PDF disagree | The generated stylesheets in `api/CvMakerPro.Render/Assets/` are stale. Re-run `build:render-assets` and redeploy — they are checked in precisely so a deployment cannot drift from the front end released with it. |

---

## Other hosts

**Railway / Render.** Both build the Dockerfile directly. Set the same two environment variables
and make sure the service port is 8080. Give it 1 GB.

**Any VPS.** `docker compose up -d --build` behind Caddy or nginx for TLS. Change the Postgres
password in `docker-compose.yml` first — the committed one says
`local-development-only` because that is all it is for.

**What will not work:** anything that only runs a static bundle (GitHub Pages, plain Netlify or
Vercel static hosting). The export needs a server that can run Chromium.

---

## Once it is live

- **Custom domain:** `fly certs add cv.yourdomain.com`, then a CNAME to `cvmakerpro.fly.dev`.
- **Scaling out:** set `Database__MigrateOnStartup=false` first and apply migrations as a release
  step (`fly deploy --strategy immediate` after `dotnet ef database update`). Two machines racing
  for the migration lock on boot is the failure this avoids.
- **Costs:** with `auto_stop_machines` on and a free Neon database, an idle deployment is pennies.
  The assistant is the only per-use cost, and it is rate-limited to 30 calls per 5 minutes per
  user.

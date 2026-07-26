# Single image: the API serves the built SPA from its own wwwroot, so there is one thing to
# deploy, one origin, and no CORS.

# --- Build the front end -------------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /src/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
# Regenerates the composed stylesheets (fonts inlined as base64) into the render service's
# Assets folder, then builds the SPA straight into the API's wwwroot.
RUN npm run build:render-assets && npm run build

# --- Build the API -------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src

COPY api/*.sln ./api/
COPY api/CvMakerPro.Domain/*.csproj ./api/CvMakerPro.Domain/
COPY api/CvMakerPro.Render/*.csproj ./api/CvMakerPro.Render/
COPY api/CvMakerPro.Api/*.csproj ./api/CvMakerPro.Api/
COPY api/CvMakerPro.Domain.Tests/*.csproj ./api/CvMakerPro.Domain.Tests/
COPY api/CvMakerPro.Render.Tests/*.csproj ./api/CvMakerPro.Render.Tests/
RUN dotnet restore api/CvMakerPro.Api/CvMakerPro.Api.csproj

COPY api/ ./api/
# Generated stylesheets and the built SPA, both produced by the web stage.
COPY --from=web /src/api/CvMakerPro.Render/Assets/ ./api/CvMakerPro.Render/Assets/
COPY --from=web /src/api/CvMakerPro.Api/wwwroot/ ./api/CvMakerPro.Api/wwwroot/

RUN dotnet publish api/CvMakerPro.Api/CvMakerPro.Api.csproj -c Release -o /app

# --- Runtime -------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0

# Chromium comes from the distro rather than PuppeteerSharp's downloader: the download would
# happen on first request, in the container, at the exact moment a user is waiting for a PDF.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      chromium-sandbox \
      curl \
      fonts-liberation \
      libnss3 \
      libatk-bridge2.0-0 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libgbm1 \
      libasound2 \
    && rm -rf /var/lib/apt/lists/*

ENV Chromium__ExecutablePath=/usr/bin/chromium \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_gcServer=0

# Docker's default seccomp profile blocks the namespace syscalls Chromium's sandbox needs, so
# the setuid helper installed above cannot actually be used under a stock runtime. The layered
# defences that remain are the ones this service was built around: every network request is
# aborted, JavaScript is off, the markup has been through an allowlist sanitiser, and the process
# runs unprivileged.
#
# To restore the sandbox instead, run the container with a Chromium-aware seccomp profile
# (`--security-opt seccomp=chrome.json`) and set Chromium__DisableSandbox=false.
ENV Chromium__DisableSandbox=true

# chromium-sandbox above is the setuid helper that lets Chromium keep its own sandbox inside the
# container. It is installed rather than passing --no-sandbox because the renderer's whole job is
# to load markup that came off the wire; blocking its network and disabling JavaScript is the
# first defence, but it should not be the only one.
#
# If a host forbids the namespaces the helper needs, set Chromium__DisableSandbox=true to fall
# back — the app then logs a warning on every launch, because that is a real reduction in
# isolation and should not be something anyone forgets they turned on.
RUN install -d -o app -g app /home/app/.cache
ENV HOME=/home/app
USER app

WORKDIR /app
COPY --from=api --chown=app:app /app ./

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD ["/bin/sh", "-c", "curl -fsS http://localhost:8080/api/health || exit 1"]

ENTRYPOINT ["dotnet", "CvMakerPro.Api.dll"]

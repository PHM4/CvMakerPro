using Microsoft.Extensions.Logging;
using PuppeteerSharp;

namespace CvMakerPro.Render;

public interface IBrowserProvider
{
    Task<IBrowser> GetAsync(CancellationToken cancellationToken = default);
}

public sealed record BrowserOptions
{
    /// <summary>
    /// Path to a Chromium binary. Set this in the container, where Chromium is installed
    /// by the image; leaving it null makes PuppeteerSharp download one, which is
    /// convenient locally and wrong in production.
    /// </summary>
    public string? ExecutablePath { get; init; }

    /// <summary>
    /// Drops Chromium's own sandbox. Only for hosts that forbid the user namespaces the setuid
    /// helper needs — it is a real reduction in isolation for a process whose entire job is
    /// loading markup that arrived over the wire, so it is opt-in and it is logged every time.
    /// </summary>
    public bool DisableSandbox { get; init; }
}

/// <summary>
/// Owns the one browser process the service uses.
///
/// Launching Chromium takes the better part of a second, so a process per export would
/// make the export button feel broken. One browser stays up and each render gets a fresh
/// page, which is the isolation that actually matters — a page carries the document, and
/// the document is what differs between requests.
/// </summary>
public sealed class BrowserProvider(BrowserOptions options, ILogger<BrowserProvider> logger)
    : IBrowserProvider, IAsyncDisposable
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private IBrowser? _browser;

    public async Task<IBrowser> GetAsync(CancellationToken cancellationToken = default)
    {
        if (_browser is { IsConnected: true })
        {
            return _browser;
        }

        await _gate.WaitAsync(cancellationToken);
        try
        {
            // Chromium can die under us — out of memory, or the container reaping it.
            // Checking inside the lock covers the case where it went away while waiting.
            if (_browser is { IsConnected: true })
            {
                return _browser;
            }

            if (_browser is not null)
            {
                logger.LogWarning("Chromium disconnected; relaunching.");
                await _browser.DisposeAsync();
            }

            _browser = await LaunchAsync();
            return _browser;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<IBrowser> LaunchAsync()
    {
        var executablePath = options.ExecutablePath;

        if (string.IsNullOrWhiteSpace(executablePath))
        {
            logger.LogInformation("No Chromium path configured; fetching a local build.");
            await new BrowserFetcher().DownloadAsync();
        }

        List<string> args =
        [
            // Containers run without the shared memory Chromium expects, and the symptom is
            // renderer crashes on larger documents rather than an error.
            "--disable-dev-shm-usage",
            "--disable-gpu",
            // No page is ever allowed to make a request, so the network service is dead weight
            // and one more thing that could reach out.
            "--disable-background-networking",
            "--no-first-run",
        ];

        if (options.DisableSandbox)
        {
            logger.LogWarning(
                "Launching Chromium with its sandbox disabled. The renderer loads markup received "
                + "over the wire, so this leaves request interception and disabled JavaScript as the "
                + "only isolation. Install chromium-sandbox and unset Chromium:DisableSandbox instead.");

            args.Add("--no-sandbox");
        }

        return await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
            ExecutablePath = executablePath,
            Args = [.. args],
        });
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser is not null)
        {
            await _browser.DisposeAsync();
        }

        _gate.Dispose();
    }
}

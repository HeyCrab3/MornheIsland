using System.Security.Cryptography;
using System.Text.Json;
using ClassIsland.Core.Abstractions.Services.Management;
using ClassIsland.Services;
using ClassIsland.Shared.Models.Management;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MornheIsland.CiPlugin;

/// <summary>
/// 莫宁岛自定义命令号（官方 CommandTypes 只到 104，自定义从 200 起）。
/// </summary>
public static class MornheIslandCommand
{
    /// <summary>插件分发：下载并安装 .cipx 插件包</summary>
    public const int PluginDeliver = 200;
}

/// <summary>插件分发请求负载（JSON）</summary>
public class PluginDeliverRequest
{
    public string Action { get; set; } = "install";
    public string PluginId { get; set; } = "";
    public string Url { get; set; } = "";
    public string Sha256 { get; set; } = "";
    public string Version { get; set; } = "";
}

/// <summary>
/// 订阅集控命令通道，处理莫宁岛下发的自定义指令。
/// </summary>
public class CommandListener : IHostedService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly ILogger<CommandListener> _logger;
    private readonly IManagementService _management;

    public CommandListener(ILogger<CommandListener> logger, IManagementService management)
    {
        _logger = logger;
        _management = management;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_management.Connection is { } conn)
        {
            conn.CommandReceived += OnCommandReceived;
            _logger.LogInformation("[MornheIsland] 已订阅集控命令通道");
        }
        else
        {
            _logger.LogWarning("[MornheIsland] 集控连接不可用，命令监听未启用");
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (_management.Connection is { } conn)
        {
            conn.CommandReceived -= OnCommandReceived;
        }
        return Task.CompletedTask;
    }

    private void OnCommandReceived(object? sender, ClientCommandEventArgs e)
    {
        if ((int)e.Type != MornheIslandCommand.PluginDeliver)
        {
            return;
        }

        var json = e.Payload.ToStringUtf8();
        _logger.LogInformation("[MornheIsland] 收到插件分发指令：{Json}", json);
        _ = Task.Run(() => HandlePluginDeliverAsync(json));
    }

    private async Task HandlePluginDeliverAsync(string json)
    {
        try
        {
            var req = JsonSerializer.Deserialize<PluginDeliverRequest>(json, JsonOpts);
            if (req is null || string.IsNullOrWhiteSpace(req.Url))
            {
                _logger.LogWarning("[MornheIsland] 插件分发指令缺少下载地址");
                return;
            }

            if (!string.Equals(req.Action, "install", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[MornheIsland] 暂不支持的插件分发动作：{Action}", req.Action);
                return;
            }

            var pkgDir = PluginService.PluginsPkgRootPath;
            Directory.CreateDirectory(pkgDir);
            var fileName = string.IsNullOrWhiteSpace(req.PluginId)
                ? $"mornheisland-{Guid.NewGuid():N}.cipx"
                : $"{req.PluginId}.cipx";
            var target = Path.Combine(pkgDir, fileName);

            var bytes = await DownloadAsync(req.Url);

            if (!string.IsNullOrWhiteSpace(req.Sha256))
            {
                var actual = Convert.ToHexString(SHA256.HashData(bytes));
                if (!actual.Equals(req.Sha256.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogError("[MornheIsland] 插件包 SHA256 校验失败，已中止安装");
                    return;
                }
            }

            await File.WriteAllBytesAsync(target, bytes);
            _logger.LogInformation("[MornheIsland] 插件包已下载到 {Path}", target);

            PluginService.ProcessPluginsInstall();
            _logger.LogInformation("[MornheIsland] 插件安装完成，重启 ClassIsland 后生效");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MornheIsland] 插件分发失败");
        }
    }

    private static async Task<byte[]> DownloadAsync(string url)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
        return await http.GetByteArrayAsync(url);
    }
}

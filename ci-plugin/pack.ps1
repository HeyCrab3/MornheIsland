# 把插件构建产物打包成 .cipx（ClassIsland 插件包格式，本质是 zip）
#
# 只打包插件自己的文件。宿主已经提供的程序集（ClassIsland*、Microsoft.Extensions.*、
# Google.Protobuf 等）一律排除：带上它们会让 PluginLoadContext 从插件目录加载出
# 与宿主不同版本的依赖，进而抛 TypeLoadException。
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$out = Join-Path $root "bin\Debug\net8.0"
$cipxDir = Join-Path $root "cipx"
$cipx = Join-Path $cipxDir "MornheIsland.CiPlugin.cipx"
$staging = Join-Path $root "obj\cipx-staging"

if (!(Test-Path $out)) {
    Write-Error "未找到构建产物，请先运行: dotnet build -c Debug"
}

# 宿主提供的程序集前缀，绝不能进包
$hostProvided = @(
    "ClassIsland.dll",
    "ClassIsland.*.dll",
    "Microsoft.Extensions.*.dll",
    "Google.Protobuf.dll",
    "System.*.dll"
)

New-Item -ItemType Directory -Force -Path $cipxDir | Out-Null
Remove-Item $cipx -Force -ErrorAction SilentlyContinue
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $staging | Out-Null

$copied = 0
$skipped = @()
Get-ChildItem -Path $out -File | ForEach-Object {
    $isHost = $false
    foreach ($pattern in $hostProvided) {
        if ($_.Name -like $pattern) { $isHost = $true; break }
    }
    if ($isHost) {
        $skipped += $_.Name
        return
    }
    Copy-Item $_.FullName -Destination $staging
    $copied++
}

if (-not (Test-Path (Join-Path $staging "manifest.yml"))) {
    Write-Error "打包内容缺少 manifest.yml，请检查构建输出"
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $cipx -Force
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue

$md5 = (Get-FileHash $cipx -Algorithm MD5).Hash.ToLowerInvariant()
$sha256 = (Get-FileHash $cipx -Algorithm SHA256).Hash.ToLowerInvariant()

Write-Output "已生成: $cipx"
Write-Output "打包含: $copied 个文件"
if ($skipped.Count -gt 0) {
    Write-Output "已排除宿主提供的程序集（$($skipped.Count)）:"
    $skipped | Sort-Object | ForEach-Object { Write-Output "  - $_" }
}
Write-Output "MD5:    $md5"
Write-Output "SHA256: $sha256"

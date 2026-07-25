$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$exePath = Join-Path $root "release\win-unpacked\NoScope.exe"
$iconPath = Join-Path $root "build\icon.ico"
$rceditPath = Join-Path $root "node_modules\electron-winstaller\vendor\rcedit.exe"

if (!(Test-Path $exePath)) {
    throw "NoScope.exe was not found at $exePath"
}
if (!(Test-Path $iconPath)) {
    throw "NoScope icon was not found at $iconPath"
}
if (!(Test-Path $rceditPath)) {
    throw "rcedit was not found at $rceditPath"
}

& $rceditPath $exePath --set-icon $iconPath
if ($LASTEXITCODE -ne 0) {
    throw "rcedit failed with exit code $LASTEXITCODE"
}

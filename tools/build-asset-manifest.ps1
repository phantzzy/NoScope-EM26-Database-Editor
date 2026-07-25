$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$script = Join-Path $projectRoot "tools\build-asset-manifest.mjs"

& node $script
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

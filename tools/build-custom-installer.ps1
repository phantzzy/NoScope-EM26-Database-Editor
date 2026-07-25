$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$appDir = Join-Path $releaseDir "win-unpacked"
$payloadPath = Join-Path $releaseDir "noscope-payload.zip"
$uninstallerPath = Join-Path $releaseDir "noscope-uninstaller.exe"
$projectPath = Join-Path $root "installer\NoScopeInstaller\NoScopeInstaller.csproj"
$publishDir = Join-Path $releaseDir "custom-installer-publish"
$uninstallerPublishDir = Join-Path $releaseDir "custom-uninstaller-publish"
$finalInstaller = Join-Path $releaseDir "NoScope-Installer.exe"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock] $Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

Push-Location $root
try {
    Invoke-Checked { npm run package }

    if (!(Test-Path (Join-Path $appDir "NoScope.exe"))) {
        throw "NoScope unpacked app was not found at $appDir"
    }
    if (Test-Path $payloadPath) {
        Remove-Item $payloadPath -Force
    }
    if (Test-Path $uninstallerPath) {
        Remove-Item $uninstallerPath -Force
    }
    Compress-Archive -Path (Join-Path $appDir "*") -DestinationPath $payloadPath -CompressionLevel Optimal

    Invoke-Checked { dotnet publish $projectPath `
        -c Release `
        -r win-x64 `
        --self-contained true `
        -p:UninstallerOnly=true `
        -p:DefineConstants=UNINSTALLER_ONLY `
        -p:AssemblyName=NoScope-Uninstaller `
        -p:PublishSingleFile=true `
        -p:EnableCompressionInSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -o $uninstallerPublishDir }

    $publishedUninstaller = Join-Path $uninstallerPublishDir "NoScope-Uninstaller.exe"
    if (!(Test-Path $publishedUninstaller)) {
        throw "Published custom uninstaller was not found at $publishedUninstaller"
    }
    Copy-Item $publishedUninstaller $uninstallerPath -Force

    Invoke-Checked { dotnet publish $projectPath `
        -c Release `
        -r win-x64 `
        --self-contained true `
        -p:PublishSingleFile=true `
        -p:EnableCompressionInSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -o $publishDir }

    $publishedExe = Join-Path $publishDir "NoScope-Installer.exe"
    if (!(Test-Path $publishedExe)) {
        throw "Published custom installer was not found at $publishedExe"
    }

    Copy-Item $publishedExe $finalInstaller -Force
    Invoke-Checked { & $finalInstaller --smoke-test }
    Invoke-Checked { & $uninstallerPath --smoke-test }

    Write-Output "Custom installer created: $finalInstaller"
}
finally {
    Pop-Location
}

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$root = Join-Path $projectRoot "assets\custom"
$folders = @("Players", "Teams", "Sponsors", "Staffs", "Tournaments")
$manifest = [ordered]@{}

foreach ($folder in $folders) {
    $entries = [ordered]@{}
    Get-ChildItem -LiteralPath (Join-Path $root $folder) -File -Filter "*.png" |
        Sort-Object Name |
        ForEach-Object {
            $key = $_.BaseName.Normalize([Text.NormalizationForm]::FormKC).ToLowerInvariant()
            $encodedName = [Uri]::EscapeDataString($_.Name)
            $entries[$key] = "assets/custom/$folder/$encodedName"
        }
    $manifest[$folder] = $entries
}

$countries = [ordered]@{}
Get-ChildItem -LiteralPath (Join-Path $projectRoot "assets\countries") -File -Filter "*.png" |
    Sort-Object Name |
    ForEach-Object {
        $countryName = $_.BaseName -replace ' National Team$', ''
        $key = $countryName.Normalize([Text.NormalizationForm]::FormKC).ToLowerInvariant()
        $countries[$key] = [ordered]@{
            name = $countryName
            path = "assets/countries/$([Uri]::EscapeDataString($_.Name))"
        }
    }
$manifest["Countries"] = $countries

$json = $manifest | ConvertTo-Json -Depth 4 -Compress
$content = "window.NOSCOPE_ASSETS = $json;"
Set-Content -LiteralPath (Join-Path $projectRoot "js\generated\asset-manifest.js") -Value $content -Encoding utf8
Write-Output "Generated js/generated/asset-manifest.js with $((($manifest.Values | ForEach-Object Count) | Measure-Object -Sum).Sum) entries."

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourcePath = Join-Path $root "assets\branding\NoScopeIcon.png"
$buildDir = Join-Path $root "build"

New-Item -ItemType Directory -Force $buildDir | Out-Null

function New-BitmapCanvas {
    param(
        [int] $Width,
        [int] $Height,
        [System.Drawing.Color] $Background
    )

    $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear($Background)

    return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-CoverImage {
    param(
        [System.Drawing.Graphics] $Graphics,
        [System.Drawing.Image] $Image,
        [int] $X,
        [int] $Y,
        [int] $Width,
        [int] $Height,
        [double] $Opacity = 1
    )

    $scale = [Math]::Max($Width / $Image.Width, $Height / $Image.Height)
    $drawWidth = [int] [Math]::Ceiling($Image.Width * $scale)
    $drawHeight = [int] [Math]::Ceiling($Image.Height * $scale)
    $drawX = $X + [int] (($Width - $drawWidth) / 2)
    $drawY = $Y + [int] (($Height - $drawHeight) / 2)

    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix33 = [single] $Opacity
    $attributes = New-Object System.Drawing.Imaging.ImageAttributes
    $attributes.SetColorMatrix($matrix, [System.Drawing.Imaging.ColorMatrixFlag]::Default, [System.Drawing.Imaging.ColorAdjustType]::Bitmap)

    $Graphics.DrawImage(
        $Image,
        (New-Object System.Drawing.Rectangle $drawX, $drawY, $drawWidth, $drawHeight),
        0,
        0,
        $Image.Width,
        $Image.Height,
        [System.Drawing.GraphicsUnit]::Pixel,
        $attributes
    )

    $attributes.Dispose()
}

function Draw-FitImage {
    param(
        [System.Drawing.Graphics] $Graphics,
        [System.Drawing.Image] $Image,
        [int] $X,
        [int] $Y,
        [int] $Width,
        [int] $Height
    )

    $scale = [Math]::Min($Width / $Image.Width, $Height / $Image.Height)
    $drawWidth = [int] [Math]::Floor($Image.Width * $scale)
    $drawHeight = [int] [Math]::Floor($Image.Height * $scale)
    $drawX = $X + [int] (($Width - $drawWidth) / 2)
    $drawY = $Y + [int] (($Height - $drawHeight) / 2)
    $Graphics.DrawImage($Image, $drawX, $drawY, $drawWidth, $drawHeight)
}

function Save-Bmp {
    param(
        [System.Drawing.Bitmap] $Bitmap,
        [string] $Path
    )

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Bmp)
}

function Resize-Image {
    param(
        [System.Drawing.Image] $Image,
        [int] $Size
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    Draw-FitImage $graphics $Image 0 0 $Size $Size
    $graphics.Dispose()
    return $bitmap
}

function Get-PngBytes {
    param([System.Drawing.Bitmap] $Bitmap)

    $stream = New-Object System.IO.MemoryStream
    $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $stream.ToArray()
    $stream.Dispose()
    return ,$bytes
}

function Save-Ico {
    param(
        [System.Drawing.Image] $Image,
        [string] $Path
    )

    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $entries = @()

    foreach ($size in $sizes) {
        $bitmap = Resize-Image $Image $size
        $bytes = Get-PngBytes $bitmap
        $entries += [PSCustomObject]@{ Size = $size; Bytes = $bytes }
        $bitmap.Dispose()
    }

    $stream = [System.IO.File]::Create($Path)
    $writer = New-Object System.IO.BinaryWriter $stream

    $writer.Write([UInt16] 0)
    $writer.Write([UInt16] 1)
    $writer.Write([UInt16] $entries.Count)

    $offset = 6 + ($entries.Count * 16)
    foreach ($entry in $entries) {
        $writer.Write([byte] $(if ($entry.Size -eq 256) { 0 } else { $entry.Size }))
        $writer.Write([byte] $(if ($entry.Size -eq 256) { 0 } else { $entry.Size }))
        $writer.Write([byte] 0)
        $writer.Write([byte] 0)
        $writer.Write([UInt16] 1)
        $writer.Write([UInt16] 32)
        $writer.Write([UInt32] $entry.Bytes.Length)
        $writer.Write([UInt32] $offset)
        $offset += $entry.Bytes.Length
    }

    foreach ($entry in $entries) {
        $writer.Write([byte[]] $entry.Bytes)
    }

    $writer.Dispose()
    $stream.Dispose()
}

$logo = [System.Drawing.Image]::FromFile($sourcePath)

$sidebar = New-BitmapCanvas 164 314 ([System.Drawing.Color]::FromArgb(13, 15, 22))
Draw-CoverImage $sidebar.Graphics $logo 0 0 164 314 0.18
$sidebarRect = New-Object System.Drawing.Rectangle -ArgumentList 0, 0, 164, 314
$sidebarBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList `
    $sidebarRect, `
    ([System.Drawing.Color]::FromArgb(18, 21, 30)), `
    ([System.Drawing.Color]::FromArgb(8, 10, 15)), `
    ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$sidebar.Graphics.FillRectangle($sidebarBrush, 0, 0, 164, 314)
$accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(239, 48, 71))
$sidebar.Graphics.FillRectangle($accentBrush, 0, 0, 5, 314)
Draw-FitImage $sidebar.Graphics $logo 28 38 108 108
$titleFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Bold)
$captionFont = New-Object System.Drawing.Font "Segoe UI", 9, ([System.Drawing.FontStyle]::Regular)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(178, 190, 205))
$sidebar.Graphics.DrawString("NoScope", $titleFont, $whiteBrush, 24, 166)
$sidebar.Graphics.DrawString("EM2026 Database Editor", $captionFont, $mutedBrush, 24, 202)
Save-Bmp $sidebar.Bitmap (Join-Path $buildDir "installerSidebar.bmp")

$header = New-BitmapCanvas 150 57 ([System.Drawing.Color]::FromArgb(13, 15, 22))
$header.Graphics.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18, 21, 30))), 0, 0, 150, 57)
$header.Graphics.FillRectangle($accentBrush, 0, 54, 150, 3)
Draw-FitImage $header.Graphics $logo 104 7 37 37
$headerTitleFont = New-Object System.Drawing.Font "Segoe UI", 12, ([System.Drawing.FontStyle]::Bold)
$header.Graphics.DrawString("NoScope", $headerTitleFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), 12, 9)
$header.Graphics.DrawString("Desktop setup", $captionFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(178, 187, 201))), 13, 31)
Save-Bmp $header.Bitmap (Join-Path $buildDir "installerHeader.bmp")

Save-Ico $logo (Join-Path $buildDir "icon.ico")
Copy-Item (Join-Path $buildDir "icon.ico") (Join-Path $buildDir "installerIcon.ico") -Force
Copy-Item (Join-Path $buildDir "icon.ico") (Join-Path $buildDir "uninstallerIcon.ico") -Force

$sidebarBrush.Dispose()
$accentBrush.Dispose()
$titleFont.Dispose()
$captionFont.Dispose()
$headerTitleFont.Dispose()
$whiteBrush.Dispose()
$mutedBrush.Dispose()
$sidebar.Graphics.Dispose()
$sidebar.Bitmap.Dispose()
$header.Graphics.Dispose()
$header.Bitmap.Dispose()
$logo.Dispose()

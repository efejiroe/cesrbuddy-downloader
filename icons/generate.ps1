Add-Type -AssemblyName System.Drawing

# 16x16 pixel-art design: white download arrow + underline on pink background.
# '.' = background (pink), 'X' = foreground (white).
$grid = @(
    "................",
    "................",
    "......XXXX......",
    "......XXXX......",
    "......XXXX......",
    "......XXXX......",
    "......XXXX......",
    "..XXXXXXXXXXXX..",
    "....XXXXXXXX....",
    "......XXXX......",
    "................",
    "................",
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "................",
    "................"
)

$bg = [System.Drawing.Color]::FromArgb(214, 51, 132)   # #d63384
$fg = [System.Drawing.Color]::White

function New-Icon {
    param([int]$Size, [string]$Path)

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::None

    # Build a 16x16 source bitmap, then scale via nearest-neighbor.
    $src = New-Object System.Drawing.Bitmap 16, 16
    for ($y = 0; $y -lt 16; $y++) {
        $row = $grid[$y]
        for ($x = 0; $x -lt 16; $x++) {
            $c = if ($row[$x] -eq 'X') { $fg } else { $bg }
            $src.SetPixel($x, $y, $c)
        }
    }

    $g.DrawImage($src, 0, 0, $Size, $Size)
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose(); $bmp.Dispose(); $src.Dispose()
}

$dir = $PSScriptRoot
New-Icon -Size 16  -Path (Join-Path $dir 'icon16.png')
New-Icon -Size 32  -Path (Join-Path $dir 'icon32.png')
New-Icon -Size 48  -Path (Join-Path $dir 'icon48.png')
New-Icon -Size 128 -Path (Join-Path $dir 'icon128.png')

Write-Output "Generated icon16.png, icon32.png, icon48.png, icon128.png in $dir"

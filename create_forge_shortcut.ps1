# Series Forge - Tactical Desktop Shortcut Creator
# Draws a military/tactical icon (target reticle + dog-tag vibe) and creates a desktop shortcut.

$desktopPath  = [Environment]::GetFolderPath('Desktop')
$targetPath   = "C:\Users\sfasa\series_forge.html"
$shortcutPath = "$desktopPath\Series Forge.lnk"
$iconPath     = "C:\Users\sfasa\forge_icon.ico"

Add-Type -AssemblyName System.Drawing

$size = 32
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(13, 15, 10))  # dark tactical bg

# Tactical palette (match the app theme)
$lime   = [System.Drawing.Color]::FromArgb(184, 226, 58)
$amber  = [System.Drawing.Color]::FromArgb(226, 161, 58)
$khaki  = [System.Drawing.Color]::FromArgb(143, 150, 120)
$dark   = [System.Drawing.Color]::FromArgb(13, 15, 10)

# Glowing lime border
$borderBrush = New-Object System.Drawing.SolidBrush($lime)
$g.FillRectangle($borderBrush, 0, 0, 32, 2)
$g.FillRectangle($borderBrush, 0, 30, 32, 2)
$g.FillRectangle($borderBrush, 0, 0, 2, 32)
$g.FillRectangle($borderBrush, 30, 0, 2, 32)

# Sniper-scope crosshair / reticle (the "series of shots" / targeting vibe)
$cx = 16; $cy = 16

# Outer reticle ring
$ringPen = New-Object System.Drawing.Pen($khaki, 2)
$g.DrawEllipse($ringPen, 6, 6, 20, 20)

# Inner ring
$innerPen = New-Object System.Drawing.Pen($lime, 1.5)
$g.DrawEllipse($innerPen, 11, 11, 10, 10)

# Crosshair lines (with a gap in the center for that scope look)
$crossPen = New-Object System.Drawing.Pen($lime, 1.5)
$g.DrawLine($crossPen, $cx, 4, $cx, 12)    # top
$g.DrawLine($crossPen, $cx, 20, $cx, 28)   # bottom
$g.DrawLine($crossPen, 4, $cy, 12, $cy)    # left
$g.DrawLine($crossPen, 20, $cy, 28, $cy)   # right

# Amber center dot (the locked target)
$dotBrush = New-Object System.Drawing.SolidBrush($amber)
$g.FillEllipse($dotBrush, 14, 14, 4, 4)

# Tick marks on the inner ring (ammo-count / series feel)
$tickPen = New-Object System.Drawing.Pen($amber, 1)
$g.DrawLine($tickPen, $cx, 12, $cx, 13.5)
$g.DrawLine($tickPen, $cx, 18.5, $cx, 20)
$g.DrawLine($tickPen, 12, $cy, 13.5, $cy)
$g.DrawLine($tickPen, 18.5, $cy, 20, $cy)

# Save as ICO
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fileStream = [System.IO.File]::Create($iconPath)
$ico.Save($fileStream)
$fileStream.Close()
$g.Dispose()
$bmp.Dispose()

Write-Host ""
Write-Host "  [TACTICAL FORGE ICON CREATED]" -ForegroundColor Yellow
Write-Host "  Location: $iconPath" -ForegroundColor Gray
Write-Host ""

# Create the shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "Series Forge - generative editions from your reference library"
$Shortcut.WorkingDirectory = "C:\Users\sfasa"
$Shortcut.Save()

Write-Host "  [DESKTOP SHORTCUT CREATED]" -ForegroundColor Green
Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Time to forge some editions, soldier." -ForegroundColor Cyan
Write-Host ""

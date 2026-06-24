# AI Art Studio - Neon Desktop Shortcut Creator
# Draws a retro neon artist-palette icon and creates a desktop shortcut.

$desktopPath  = [Environment]::GetFolderPath('Desktop')
$targetPath   = "C:\Users\sfasa\ai_art_studio.html"
$shortcutPath = "$desktopPath\AI Art Studio.lnk"
$iconPath     = "C:\Users\sfasa\art_icon.ico"

Add-Type -AssemblyName System.Drawing

$size = 32
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(13, 11, 26))  # dark studio bg

# Neon palette colors (match the app theme)
$pink    = [System.Drawing.Color]::FromArgb(255, 77, 210)
$cyan    = [System.Drawing.Color]::FromArgb(77, 210, 255)
$green   = [System.Drawing.Color]::FromArgb(109, 255, 176)
$gold    = [System.Drawing.Color]::FromArgb(255, 213, 77)
$orange  = [System.Drawing.Color]::FromArgb(255, 94, 77)
$purple  = [System.Drawing.Color]::FromArgb(180, 77, 255)
$darkBg  = [System.Drawing.Color]::FromArgb(13, 11, 26)

# Glowing border
$borderBrush = New-Object System.Drawing.SolidBrush($pink)
$g.FillRectangle($borderBrush, 0, 0, 32, 2)
$g.FillRectangle($borderBrush, 0, 30, 32, 2)
$g.FillRectangle($borderBrush, 0, 0, 2, 32)
$g.FillRectangle($borderBrush, 30, 0, 2, 32)

# Artist palette body (rounded blob)
$paletteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 28, 68))
$g.FillEllipse($paletteBrush, 4, 6, 22, 20)

# Thumb hole
$holeBrush = New-Object System.Drawing.SolidBrush($darkBg)
$g.FillEllipse($holeBrush, 17, 17, 6, 6)

# Paint blobs around the palette
$g.FillEllipse((New-Object System.Drawing.SolidBrush($pink)),   7, 9,  5, 5)
$g.FillEllipse((New-Object System.Drawing.SolidBrush($cyan)),   13, 8,  5, 5)
$g.FillEllipse((New-Object System.Drawing.SolidBrush($gold)),   19, 9,  5, 5)
$g.FillEllipse((New-Object System.Drawing.SolidBrush($green)),  6, 16,  5, 5)
$g.FillEllipse((New-Object System.Drawing.SolidBrush($purple)), 11, 18, 5, 5)

# Paintbrush across the corner
$brushPen = New-Object System.Drawing.Pen($orange, 3)
$g.DrawLine($brushPen, 20, 28, 28, 20)
$tipBrush = New-Object System.Drawing.SolidBrush($gold)
$g.FillEllipse($tipBrush, 26, 18, 4, 4)

# Save as ICO
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fileStream = [System.IO.File]::Create($iconPath)
$ico.Save($fileStream)
$fileStream.Close()
$g.Dispose()
$bmp.Dispose()

Write-Host ""
Write-Host "  [NEON ART ICON CREATED]" -ForegroundColor Magenta
Write-Host "  Location: $iconPath" -ForegroundColor Gray
Write-Host ""

# Create the shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "AI Art Studio - hybrid generator and canvas editor"
$Shortcut.WorkingDirectory = "C:\Users\sfasa"
$Shortcut.Save()

Write-Host "  [DESKTOP SHORTCUT CREATED]" -ForegroundColor Green
Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Time to make some art!" -ForegroundColor Cyan
Write-Host ""

# Sound Visualizer - Neon Desktop Shortcut Creator
# Draws a retro neon equalizer/waveform icon and creates a desktop shortcut.

$desktopPath  = [Environment]::GetFolderPath('Desktop')
$targetPath   = "C:\Users\sfasa\sound_visualizer.html"
$shortcutPath = "$desktopPath\Sound Visualizer.lnk"
$iconPath     = "C:\Users\sfasa\sound_icon.ico"

Add-Type -AssemblyName System.Drawing

$size = 32
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(13, 11, 26))  # dark studio bg

# Neon colors (match the app theme)
$pink   = [System.Drawing.Color]::FromArgb(255, 77, 210)
$cyan   = [System.Drawing.Color]::FromArgb(77, 210, 255)
$green  = [System.Drawing.Color]::FromArgb(109, 255, 176)
$gold   = [System.Drawing.Color]::FromArgb(255, 213, 77)
$purple = [System.Drawing.Color]::FromArgb(180, 77, 255)

# Glowing pink border
$borderBrush = New-Object System.Drawing.SolidBrush($pink)
$g.FillRectangle($borderBrush, 0, 0, 32, 2)
$g.FillRectangle($borderBrush, 0, 30, 32, 2)
$g.FillRectangle($borderBrush, 0, 0, 2, 32)
$g.FillRectangle($borderBrush, 30, 0, 2, 32)

# Equalizer bars (spectrum vibe) - varying heights, neon gradient across
$barColors = @($cyan, $green, $gold, $pink, $purple, $cyan, $green)
$barHeights = @(8, 16, 22, 12, 20, 10, 14)
$x = 5
for ($i = 0; $i -lt $barColors.Length; $i++) {
    $h = $barHeights[$i]
    $b = New-Object System.Drawing.SolidBrush($barColors[$i])
    $g.FillRectangle($b, $x, (28 - $h), 2, $h)
    $b.Dispose()
    $x += 3
}

# Sine wave overlay across the middle (the "wave" part)
$wavePen = New-Object System.Drawing.Pen($green, 1.5)
$pts = New-Object System.Collections.ArrayList
for ($px = 4; $px -le 28; $px++) {
    $py = 16 + [Math]::Sin(($px - 4) * 0.55) * 5
    [void]$pts.Add((New-Object System.Drawing.PointF($px, $py)))
}
$g.DrawLines($wavePen, [System.Drawing.PointF[]]$pts.ToArray())

# Save as ICO
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fileStream = [System.IO.File]::Create($iconPath)
$ico.Save($fileStream)
$fileStream.Close()
$g.Dispose()
$bmp.Dispose()

Write-Host ""
Write-Host "  [NEON SOUND ICON CREATED]" -ForegroundColor Magenta
Write-Host "  Location: $iconPath" -ForegroundColor Gray
Write-Host ""

# Create the shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "Sound Visualizer - See Sound, live audio-reactive art"
$Shortcut.WorkingDirectory = "C:\Users\sfasa"
$Shortcut.Save()

Write-Host "  [DESKTOP SHORTCUT CREATED]" -ForegroundColor Green
Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Crank the music and watch it dance!" -ForegroundColor Cyan
Write-Host ""

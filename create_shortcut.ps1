# DnB Generator - Retro Desktop Shortcut Creator
# Creates a cool retro neon drum machine icon and desktop shortcut

$desktopPath = [Environment]::GetFolderPath('Desktop')
$targetPath = "C:\Users\sfasa\dnb_generator.html"
$shortcutPath = "$desktopPath\DnB Generator.lnk"
$iconPath = "C:\Users\sfasa\dnb_icon.ico"

# Create a 32x32 retro neon drum machine icon
# Using proper ICO format with BMP data
Add-Type -AssemblyName System.Drawing

$size = 32
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(10, 10, 15))  # Dark background

# Define neon colors
$cyan = [System.Drawing.Color]::FromArgb(0, 255, 255)
$magenta = [System.Drawing.Color]::FromArgb(255, 0, 255)
$pink = [System.Drawing.Color]::FromArgb(255, 0, 128)
$green = [System.Drawing.Color]::FromArgb(0, 255, 136)
$gold = [System.Drawing.Color]::FromArgb(255, 215, 0)
$darkBg = [System.Drawing.Color]::FromArgb(18, 18, 26)
$gridLine = [System.Drawing.Color]::FromArgb(40, 40, 60)

# Draw border glow
$borderBrush = New-Object System.Drawing.SolidBrush($cyan)
$g.FillRectangle($borderBrush, 0, 0, 32, 2)
$g.FillRectangle($borderBrush, 0, 30, 32, 2)
$g.FillRectangle($borderBrush, 0, 0, 2, 32)
$g.FillRectangle($borderBrush, 30, 0, 2, 32)

# Draw inner panel
$panelBrush = New-Object System.Drawing.SolidBrush($darkBg)
$g.FillRectangle($panelBrush, 3, 3, 26, 26)

# Draw step sequencer grid (4x4 pattern)
$stepSize = 5
$startX = 5
$startY = 5

# Row 1 - Kick pattern (pink) - steps 1, 5, 9, 13
$kickBrush = New-Object System.Drawing.SolidBrush($pink)
$g.FillRectangle($kickBrush, $startX, $startY, $stepSize, $stepSize)
$g.FillRectangle($kickBrush, $startX + 12, $startY, $stepSize, $stepSize)

# Row 2 - Snare pattern (magenta) - steps 5, 13
$snareBrush = New-Object System.Drawing.SolidBrush($magenta)
$g.FillRectangle($snareBrush, $startX + 6, $startY + 6, $stepSize, $stepSize)
$g.FillRectangle($snareBrush, $startX + 18, $startY + 6, $stepSize, $stepSize)

# Row 3 - Hi-hat pattern (cyan) - all steps
$hatBrush = New-Object System.Drawing.SolidBrush($cyan)
for ($i = 0; $i -lt 4; $i++) {
    $g.FillRectangle($hatBrush, $startX + ($i * 6), $startY + 12, $stepSize, $stepSize)
}

# Row 4 - Bass pattern (green) - steps 1, 3
$bassBrush = New-Object System.Drawing.SolidBrush($green)
$g.FillRectangle($bassBrush, $startX, $startY + 18, $stepSize, $stepSize)
$g.FillRectangle($bassBrush, $startX + 12, $startY + 18, $stepSize, $stepSize)

# Add gold accent dots (French electro style)
$goldBrush = New-Object System.Drawing.SolidBrush($gold)
$g.FillRectangle($goldBrush, 27, 4, 2, 2)
$g.FillRectangle($goldBrush, 27, 8, 2, 2)

# Save as ICO
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fileStream = [System.IO.File]::Create($iconPath)
$ico.Save($fileStream)
$fileStream.Close()

# Cleanup
$g.Dispose()
$bmp.Dispose()

Write-Host ""
Write-Host "  888888b.           888888b." -ForegroundColor Cyan
Write-Host "  888  '88b          888  '88b" -ForegroundColor Cyan  
Write-Host "  888  .88P 888b.    888888P'" -ForegroundColor Magenta
Write-Host "  8888888K. '888b    888 '88b." -ForegroundColor Magenta
Write-Host "  888  'Y88b 888    888   '88b" -ForegroundColor DarkMagenta
Write-Host "  888    888 888    888    888" -ForegroundColor DarkMagenta
Write-Host "  888   d88P        888   d88P" -ForegroundColor DarkRed
Write-Host "  8888888P'         8888888P'" -ForegroundColor DarkRed
Write-Host ""
Write-Host "  [RETRO ICON CREATED]" -ForegroundColor Yellow
Write-Host "  Location: $iconPath" -ForegroundColor Gray
Write-Host ""

# Create the shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "DnB + French Electro + G-House Generator"
$Shortcut.WorkingDirectory = "C:\Users\sfasa"
$Shortcut.Save()

Write-Host "  [DESKTOP SHORTCUT CREATED]" -ForegroundColor Green
Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Ready to drop some beats!" -ForegroundColor Cyan
Write-Host ""

@echo off
echo.
echo  ============================================
echo   DnB Generator - RESTORE STABLE VERSION
echo  ============================================
echo.
echo  This will restore the stable working version
echo  from: checkpoints\STABLE_dnb_generator_20260201.html
echo.
echo  Current version will be backed up first.
echo.
pause

echo.
echo  [1/3] Backing up current version...
copy "C:\Users\sfasa\dnb_generator.html" "C:\Users\sfasa\checkpoints\BACKUP_before_restore_%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%.html" >nul
echo        Done!

echo  [2/3] Restoring stable version...
copy "C:\Users\sfasa\checkpoints\STABLE_dnb_generator_20260201.html" "C:\Users\sfasa\dnb_generator.html" >nul
echo        Done!

echo  [3/3] Verifying...
dir "C:\Users\sfasa\dnb_generator.html" | findstr "dnb_generator.html"

echo.
echo  ============================================
echo   RESTORE COMPLETE!
echo  ============================================
echo.
echo  You can now open DnB Generator from your
echo  desktop shortcut.
echo.
pause

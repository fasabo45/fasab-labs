@echo off
REM ============================================================
REM  Series Forge - Pinterest board importer
REM  Downloads a whole PUBLIC Pinterest board (full-res originals)
REM  into a folder, ready to drag into Series Forge's Library.
REM
REM  Usage:
REM    pin_import.bat                 (it will ask for the URL)
REM    pin_import.bat <board-url>     (pass the URL directly)
REM ============================================================
setlocal
set "DEST=%USERPROFILE%\series_forge_refs"

set "URL=%~1"
if not defined URL set /p "URL=Paste Pinterest board URL: "
if not defined URL (
  echo.
  echo No URL provided. Nothing to do.
  pause
  exit /b 1
)

echo.
echo Downloading board into: "%DEST%"
echo   %URL%
echo ------------------------------------------------------------
gallery-dl -d "%DEST%" "%URL%"
set "RC=%ERRORLEVEL%"
echo ------------------------------------------------------------
if not "%RC%"=="0" (
  echo.
  echo gallery-dl exited with code %RC%. If the board is private,
  echo you'll need cookies - ask Brodie to set that up.
  pause
  exit /b %RC%
)

echo.
echo DONE. Now in Series Forge:
echo   Library tab  -^>  "+ Import Folder"  -^>  pick the board folder under:
echo   %DEST%\pinterest\
echo.
pause

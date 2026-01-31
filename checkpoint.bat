@echo off
REM Manual Checkpoint Script (until git is installed)
REM Usage: checkpoint.bat "description of changes"

set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set DESC=%~1

if "%DESC%"=="" (
    echo Usage: checkpoint.bat "description of changes"
    exit /b 1
)

if not exist "checkpoints" mkdir checkpoints

copy dnb_generator.html "checkpoints\dnb_generator_%TIMESTAMP%.html"

echo %TIMESTAMP%: %DESC% >> checkpoints\CHANGELOG.txt
echo. >> checkpoints\CHANGELOG.txt

echo Checkpoint created: checkpoints\dnb_generator_%TIMESTAMP%.html
echo Description: %DESC%

@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo Stopping processes listening on port 7000...
echo.

set "FOUND=0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7000" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Killing PID %%a
  taskkill /PID %%a /F >nul 2>&1
  if errorlevel 1 (
    echo   Failed to kill PID %%a — try running this file as Administrator.
  ) else (
    echo   Stopped PID %%a
  )
)

if "%FOUND%"=="0" (
  echo No process found listening on port 7000.
) else (
  echo.
  echo Done. Port 7000 should be free.
)

echo.
pause

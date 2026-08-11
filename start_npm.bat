@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo Starting Family Fitness dev server on port 7000...
echo Open http://localhost:7000 in your browser.
echo Press Ctrl+C to stop.
echo.

if not exist "node_modules\" (
  echo node_modules not found — running npm install first...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

call npm.cmd run dev

pause

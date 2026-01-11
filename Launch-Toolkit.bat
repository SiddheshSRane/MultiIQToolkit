@echo off
TITLE MultiIQ Toolkit Launcher
SETLOCAL EnableDelayedExpansion

:: ---------------------------------------------------------
:: MultiIQ Toolkit - Professional One-Click Launcher
:: ---------------------------------------------------------

echo.
echo  [94m==================================================== [0m
echo  [96m        🧠 MultiIQ Toolkit: Starting Services...      [0m
echo  [94m==================================================== [0m
echo.

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [91m[ERROR] Python is not installed or not in PATH. [0m
    pause
    exit /b
)

:: 2. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  [91m[ERROR] Node.js is not installed or not in PATH. [0m
    pause
    exit /b
)

:: 3. Start Backend
echo  [92m[1/3] Starting Python Backend (FastAPI)... [0m
start "MultiIQ Backend" /min cmd /c "python main.py"

:: 4. Start Frontend
echo  [92m[2/3] Starting React Frontend (Vite)... [0m
cd frontend
start "MultiIQ Frontend" /min cmd /c "npm run dev"

:: 5. Launch Browser
echo  [92m[3/3] Opening your browser... [0m
timeout /t 5 /nobreak >nul
start http://localhost:5173/

echo.
echo  [94m---------------------------------------------------- [0m
echo  [96m  🚀 Toolkit is now running!                           [0m
echo  [93m  (Keep this window open to maintain the connection)    [0m
echo  [94m---------------------------------------------------- [0m
echo.

:: Keep the window open to show logs or status
pause

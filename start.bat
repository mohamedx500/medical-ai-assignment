@echo off
REM ─────────────────────────────────────────
REM  MedAI — Start Backend + Frontend
REM ─────────────────────────────────────────
REM  Usage: double-click this file, or run
REM         start.bat
REM  from the project root.
REM ─────────────────────────────────────────

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       MedAI — Medical AI Expert System   ║
echo  ╚══════════════════════════════════════════╝
echo.

REM ── Check Python ──
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+.
    pause
    exit /b 1
)

REM ── Check Node ──
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+.
    pause
    exit /b 1
)

REM ── Kill existing processes on ports 3000 and 8000 ──
echo [0/4] Cleaning up old instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt -q

echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install --silent

echo [3/4] Starting backend  (http://localhost:8000)...
cd /d "%~dp0backend"
start "MedAI Backend" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [4/4] Starting frontend (http://localhost:3000)...
cd /d "%~dp0frontend"
start "MedAI Frontend" cmd /k "npm run dev"

echo.
echo  ✓ Backend  → http://localhost:8000
echo  ✓ Frontend → http://localhost:3000
echo  ✓ API Docs → http://localhost:8000/docs
echo.
echo  Close the two terminal windows to stop the servers.
echo.
pause

@echo off
title StockSense Launcher
echo ===================================================
echo           Starting StockSense Servers
echo ===================================================
echo.

:: Change directory to script location
cd /d "%~dp0"

echo [1/2] Launching Backend Server (Port 5000)...
start "StockSense - Backend" cmd /k "cd server && npm run dev"

echo [2/2] Launching Frontend Client (Port 5173)...
start "StockSense - Frontend" cmd /k "cd client && npm run dev"

echo.
echo ===================================================
echo Backend and Frontend launched in dedicated windows.
echo - Backend:  http://localhost:5000
echo - Frontend: http://localhost:5173
echo ===================================================
echo.
pause

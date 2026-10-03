@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm is required. Install Node.js and reopen this file.
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Owner Web: http://localhost:5173
echo Start agritrace_db and agritrace_backend in Docker Desktop first.
echo Keep this window open while using Owner Web.
call npm.cmd run dev
if errorlevel 1 pause

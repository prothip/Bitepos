@echo off
REM BitePOS Windows Build Script
REM Run this on a Windows PC with Node.js installed
REM 
REM Prerequisites:
REM   1. Install Node.js 22+ from https://nodejs.org
REM   2. Install Git from https://git-scm.com
REM   3. Copy the bitepos project folder to your Windows PC

echo ============================================
echo   BitePOS Windows Build
echo ============================================
echo.

REM Step 1: Install dependencies
echo [1/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 goto error

REM Step 2: Reset database for production
echo [2/5] Resetting database for production...
call bash scripts/reset-db-prod.sh
if %ERRORLEVEL% NEQ 0 (
  echo Database reset failed, using existing DB
)

REM Step 3: Build Next.js
echo [3/5] Building Next.js...
call npx next build
if %ERRORLEVEL% NEQ 0 goto error

REM Step 4: Package Electron app
echo [4/5] Packaging Electron app...
call npx electron-builder --win
if %ERRORLEVEL% NEQ 0 goto error

REM Step 5: Done!
echo [5/5] Build complete!
echo.
echo ============================================
echo   Your installer is in: dist-electron\
echo   Run the .exe to install BitePOS
echo ============================================
echo.
echo Default PINs: Admin=1234, Manager=5678
echo Remind customer to change these on first login!
echo.
goto end

:error
echo.
echo BUILD FAILED! Check the error messages above.
echo.

:end
pause
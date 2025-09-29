@echo off
REM Dentist Video Platform Startup Script for Windows
REM This script automates the complete setup and startup process

echo.
echo 🦷 Dentist Video Platform - Automated Setup
echo ===========================================
echo.

REM Check if Node.js is installed
echo [STEP] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16+ first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js %NODE_VERSION% is installed ✓

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [INFO] npm %NPM_VERSION% is installed ✓

REM Check if FFmpeg is installed
echo [STEP] Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg is not installed. Video processing will not work.
    echo Please install FFmpeg:
    echo   Download from: https://ffmpeg.org/download.html
    echo   Or use chocolatey: choco install ffmpeg
    echo.
    set /p continue="Continue without FFmpeg? (y/N): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    echo [INFO] FFmpeg is installed ✓
)

REM Install dependencies
echo [STEP] Installing dependencies...
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed ✓
) else (
    echo [INFO] Dependencies already installed ✓
)

REM Check if .env file exists
echo [STEP] Checking environment configuration...
if not exist ".env" (
    if exist "env.example" (
        copy env.example .env >nul
        echo [INFO] Created .env file from env.example
        echo [WARNING] Please edit .env file with your configuration before starting the server
        echo.
        echo Required configuration:
        echo   - EMAIL_HOST, EMAIL_USER, EMAIL_PASS (for email functionality)
        echo   - JWT_SECRET (change from default)
        echo   - SESSION_SECRET (change from default)
        echo.
        set /p edit="Edit .env file now? (y/N): "
        if /i "%edit%"=="y" (
            notepad .env
        )
    ) else (
        echo [ERROR] No .env file or env.example found
        pause
        exit /b 1
    )
) else (
    echo [INFO] Environment configuration found ✓
)

REM Run setup script
echo [STEP] Running application setup...
if exist "scripts\setup.js" (
    node scripts/setup.js
    if %errorlevel% neq 0 (
        echo [ERROR] Setup failed
        pause
        exit /b 1
    )
    echo [INFO] Application setup completed ✓
) else (
    echo [WARNING] Setup script not found, skipping...
)

REM Create necessary directories
echo [STEP] Creating necessary directories...
if not exist "uploads" mkdir uploads
if not exist "database" mkdir database
if not exist "logs" mkdir logs
if not exist "backups" mkdir backups
echo [INFO] Directories created ✓

REM Check if database exists
if not exist "database\dentist_platform.db" (
    echo [WARNING] Database not found. Make sure setup script ran successfully.
)

REM Display startup information
echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Default accounts created:
echo   Admin:      admin@dentistplatform.com / admin123!@#
echo   Senior:     senior@dentistplatform.com / senior123!@#
echo   Junior:     junior@dentistplatform.com / junior123!@#
echo.
echo 🚀 Starting the server...

REM Start the server
if "%1"=="dev" (
    echo [STEP] Starting development server with nodemon...
    npm run dev
) else (
    echo [STEP] Starting production server...
    npm start
)

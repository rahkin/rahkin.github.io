@echo off
echo Setting up Pokka Snakes GL Client...

:: Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

:: Check if sox is installed
where sox >nul 2>nul
if %errorlevel% neq 0 (
    echo Sox is not installed. Please install it from: http://sox.sourceforge.net/
    echo After installing sox, run this script again.
    pause
    exit /b 1
)

:: Generate sound files
echo Generating sound files...
npm run generate-sounds

echo Setup complete!
pause
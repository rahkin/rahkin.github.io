@echo off
echo Cleaning up old files...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Creating directory structure...
mkdir client\src\core
mkdir client\src\effects
mkdir client\src\gameplay
mkdir client\src\physics
mkdir client\src\rendering
mkdir client\src\ui
mkdir client\styles
mkdir client\assets\sounds
mkdir client\assets\textures
mkdir server\src

echo Installing dependencies...
call npm install

echo Setup complete!
pause
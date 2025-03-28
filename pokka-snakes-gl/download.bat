@echo off
echo Downloading game files...

curl -o package.json https://raw.githubusercontent.com/yourusername/pokka-snakes-gl/main/package.json
curl -o index.html https://raw.githubusercontent.com/yourusername/pokka-snakes-gl/main/index.html

REM Download client files
cd client\src
curl -o main.js https://raw.githubusercontent.com/yourusername/pokka-snakes-gl/main/client/src/main.js
cd core
curl -o Game.js https://raw.githubusercontent.com/yourusername/pokka-snakes-gl/main/client/src/core/Game.js
cd ..
cd ..
cd ..

echo Files downloaded successfully!
pause 
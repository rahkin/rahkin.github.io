# Pokka Snakes GL - Windows Setup Guide

## Prerequisites Installation
1. Install Node.js:
   - Go to https://nodejs.org/
   - Download and install the LTS version
   - Verify installation by opening Command Prompt and typing:
     ```
     node --version
     npm --version
     ```

2. Create Project Directory:
   - Open Command Prompt as Administrator
   - Navigate to where you want to create the game:
     ```
     cd C:\Users\YourUsername\Documents
     mkdir pokka-snakes-gl
     cd pokka-snakes-gl
     ```

## Setup Files
1. Create `setup.bat` with this content:
```batch
@echo off
echo Setting up Pokka Snakes GL...

echo Creating directory structure...
mkdir client
mkdir client\src
mkdir client\src\core
mkdir client\src\effects
mkdir client\src\gameplay
mkdir client\src\physics
mkdir client\src\rendering
mkdir client\src\ui
mkdir client\styles
mkdir client\assets
mkdir client\assets\sounds
mkdir client\assets\textures
mkdir server
mkdir server\src

echo Initializing npm project...
call npm init -y

echo Installing dependencies...
call npm install three socket.io-client express socket.io vite
call npm install --save-dev nodemon concurrently

echo Creating package.json...
echo {
echo   "name": "pokka-snakes-gl",
echo   "version": "1.0.0",
echo   "scripts": {
echo     "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
echo     "dev:client": "vite",
echo     "dev:server": "nodemon server/index.js",
echo     "build": "vite build",
echo     "start": "node server/index.js",
echo     "preview": "vite preview"
echo   },
echo   "dependencies": {
echo     "express": "^4.17.1",
echo     "socket.io": "^4.5.1",
echo     "socket.io-client": "^4.5.1",
echo     "three": "^0.150.0"
echo   },
echo   "devDependencies": {
echo     "concurrently": "^7.0.0",
echo     "nodemon": "^2.0.15",
echo     "vite": "^4.0.0"
echo   }
echo } > package.json

echo Setup complete!
echo To start the game, run: npm run dev
pause
```

2. Create `start.bat`:
```batch
@echo off
echo Starting Pokka Snakes GL...
call npm run dev
pause
```

## Step-by-Step Setup Instructions

1. Create Base Directory:
   - Create a new folder called `pokka-snakes-gl`
   - Copy both `setup.bat` and `start.bat` into this folder

2. Run Setup:
   - Double-click `setup.bat`
   - Wait for all installations to complete

3. Create Essential Files:
   - In the `client/src` folder, create these files:

   `main.js`:
   ```javascript
   import { GameIntegration } from './core/GameIntegration';

   window.addEventListener('load', () => {
       const game = new GameIntegration();
       function animate(timestamp) {
           requestAnimationFrame(animate);
           game.update(timestamp);
       }
       animate();
   });
   ```

   `index.html` (in root directory):
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Pokka's Snakes GL</title>
       <link rel="stylesheet" href="client/styles/main.css">
       <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
   </head>
   <body>
       <canvas id="gameCanvas"></canvas>
       <div id="gameUI" class="game-ui">
           <div class="score-container">
               <span id="score">0</span>
           </div>
       </div>
       <script type="module" src="/client/src/main.js"></script>
   </body>
   </html>
   ```

4. Start the Game:
   - Double-click `start.bat`
   - Open your browser and go to: http://localhost:3000

## Troubleshooting

If you encounter any errors:

1. Port Issues:
   - If port 3000 is in use, modify the port in server/index.js
   - Default ports needed: 3000 and 5173

2. Node.js Issues:
   - Verify Node.js installation: `node --version`
   - Try running Command Prompt as Administrator
   - Restart your computer after installing Node.js

3. Missing Dependencies:
   - Delete the node_modules folder
   - Run: `npm install` again

4. File Permission Issues:
   - Right-click setup.bat
   - Run as Administrator

5. Network Issues:
   - Check your firewall settings
   - Ensure localhost isn't blocked

## Quick Commands Reference

```bash
# Install dependencies manually
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## File Structure
# Pokka Snakes GL - Windows Setup Guide

## Prerequisites
1. Install Node.js from https://nodejs.org/ (LTS version)
2. Install Git from https://git-scm.com/download/win

## Quick Setup
1. Create a new folder for the game
2. Download all the setup files into this folder
3. Double-click `setup.bat`
4. Double-click `download.bat`
5. Double-click `start.bat`

## Manual Setup
If you prefer to set up manually:

1. Open Command Prompt as Administrator
2. Run these commands:
```bash
mkdir pokka-snakes-gl
cd pokka-snakes-gl
npm init -y
npm install three socket.io-client express socket.io vite
npm install --save-dev nodemon concurrently
```

3. Start the game:
```bash
npm run dev
```

## Troubleshooting
- If you see "command not found", make sure Node.js is installed properly
- If ports are in use, modify the port numbers in server/index.js
- Make sure your firewall isn't blocking the connections 
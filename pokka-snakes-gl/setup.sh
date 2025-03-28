#!/bin/bash

echo "Setting up Pokka Snakes GL..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Homebrew
if ! command_exists brew; then
    echo "Homebrew is not installed. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for current session
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Check for Node.js
if ! command_exists node; then
    echo "Node.js is not installed. Installing Node.js..."
    brew install node
fi

# Verify Node.js installation
echo "Verifying Node.js installation..."
node_version=$(node --version)
npm_version=$(npm --version)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Create directory structure
echo "Creating directory structure..."
mkdir -p client/src/{core,effects,gameplay,physics,rendering,ui}
mkdir -p client/styles
mkdir -p client/assets/{sounds,textures}
mkdir -p server/src

# Initialize npm project if package.json doesn't exist
if [ ! -f package.json ]; then
    echo "Initializing npm project..."
    npm init -y
fi

# Install dependencies
echo "Installing dependencies..."
npm install three socket.io-client express socket.io vite
npm install --save-dev nodemon concurrently

# Create or update package.json
echo "Creating/updating package.json..."
cat > package.json << 'EOL'
{
  "name": "pokka-snakes-gl",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "vite",
    "dev:server": "nodemon server/index.js",
    "build": "vite build",
    "start": "node server/index.js",
    "preview": "vite preview"
  },
  "dependencies": {
    "express": "^4.17.1",
    "socket.io": "^4.5.1",
    "socket.io-client": "^4.5.1",
    "three": "^0.150.0"
  },
  "devDependencies": {
    "concurrently": "^7.0.0",
    "nodemon": "^2.0.15",
    "vite": "^4.0.0"
  }
}
EOL

# Create basic server file if it doesn't exist
if [ ! -f server/index.js ]; then
    echo "Creating server/index.js..."
    mkdir -p server
    cat > server/index.js << 'EOL'
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('dist'));

io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
EOL
fi

# Create basic client files if they don't exist
if [ ! -f client/src/main.js ]; then
    echo "Creating client/src/main.js..."
    mkdir -p client/src
    cat > client/src/main.js << 'EOL'
import { GameIntegration } from './core/GameIntegration';

window.addEventListener('load', () => {
    const game = new GameIntegration();
    function animate(timestamp) {
        requestAnimationFrame(animate);
        game.update(timestamp);
    }
    animate();
});
EOL
fi

# Create basic CSS file if it doesn't exist
if [ ! -f client/styles/main.css ]; then
    echo "Creating client/styles/main.css..."
    mkdir -p client/styles
    cat > client/styles/main.css << 'EOL'
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #000;
}

#gameCanvas {
    width: 100vw;
    height: 100vh;
    display: block;
}

.game-ui {
    position: fixed;
    top: 20px;
    left: 20px;
    color: white;
    font-family: 'Press Start 2P', cursive;
    z-index: 1000;
}

.score-container {
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 5px;
}
EOL
fi

# Create vite.config.js if it doesn't exist
if [ ! -f vite.config.js ]; then
    echo "Creating vite.config.js..."
    cat > vite.config.js << 'EOL'
import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: './',
    server: {
        port: 5173
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    }
});
EOL
fi

echo "Setup complete!"
echo "To start the game, run: ./start.sh" 
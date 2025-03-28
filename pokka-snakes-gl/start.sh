#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if ! command_exists node; then
    echo "Error: Node.js is not installed. Please run setup.sh first."
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo "Error: npm is not installed. Please run setup.sh first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing dependencies..."
    npm install
fi

echo "Starting Pokka Snakes GL..."
echo "The game will be available at http://localhost:3000"
npm run dev 
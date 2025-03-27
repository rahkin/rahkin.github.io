// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 25;  // Reduced block size for better fit
const MAX_LEADERBOARD_ENTRIES = 5;
const COLORS = [
    '#FF0D0D', // red
    '#0DFF1D', // green
    '#0D85FF', // blue
    '#FFD90D', // yellow
    '#FF0DFF', // magenta
    '#0DFFF3', // cyan
    '#FF8E0D'  // orange
];

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]],                    // I
    [[1, 1], [1, 1]],                  // O
    [[1, 1, 1], [0, 1, 0]],           // T
    [[1, 1, 1], [1, 0, 0]],           // L
    [[1, 1, 1], [0, 0, 1]],           // J
    [[1, 1, 0], [0, 1, 1]],           // S
    [[0, 1, 1], [1, 1, 0]]            // Z
];

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = BLOCK_SIZE * BOARD_WIDTH;
        this.canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
        
        // Scale up the canvas display size while maintaining internal resolution
        this.canvas.style.width = (BLOCK_SIZE * BOARD_WIDTH * 1.5) + 'px';
        this.canvas.style.height = (BLOCK_SIZE * BOARD_HEIGHT * 1.5) + 'px';
        
        this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.paused = false;
        this.started = false;
        
        // Current and next piece state
        this.currentPiece = null;
        this.currentX = 0;
        this.currentY = 0;
        this.currentColor = '';
        this.nextPiece = null;
        this.nextColor = '';
        
        // Update score and level displays
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        
        // Bind event handlers
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Initialize game loop
        this.dropInterval = 1000;
        this.lastDrop = Date.now();
        this.gameLoop();
        
        // Draw start screen
        this.drawStartScreen();
        
        // Load leaderboard
        this.leaderboard = this.loadLeaderboard();
        this.updateLeaderboardDisplay();
        
        this.playerName = '';
    }

    start() {
        if (!this.started) {
            // Prompt for player name
            let name = prompt('Enter your name:', localStorage.getItem('lastPlayerName') || '');
            if (!name) return; // Don't start if no name provided
            
            name = name.trim();
            if (name.length > 20) name = name.substring(0, 20); // Limit name length
            if (name.length === 0) name = 'Anonymous';
            
            this.playerName = name;
            localStorage.setItem('lastPlayerName', name); // Remember name for next time
            
            this.started = true;
            this.gameOver = false;
            this.score = 0;
            this.level = 1;
            document.getElementById('score').textContent = this.score;
            document.getElementById('level').textContent = this.level;
            
            // Clear the board
            this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
            
            // Spawn first pieces
            this.nextPiece = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            this.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.spawnPiece();
        }
    }

    drawStartScreen() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px "One Little Font"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("POKKA'S", 
            this.canvas.width / 2,
            this.canvas.height / 3);
        this.ctx.fillText('FALLING BLOCKS', 
            this.canvas.width / 2,
            this.canvas.height / 3 + 30);
            
        // Draw instructions
        this.ctx.font = '16px "One Little Font"';
        this.ctx.fillText('Click START to play!', 
            this.canvas.width / 2,
            this.canvas.height / 2 + 30);
        this.ctx.fillText('Enter your name to join the leaderboard', 
            this.canvas.width / 2,
            this.canvas.height / 2 + 60);
    }
    
    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.currentColor = this.nextColor;
        this.currentX = Math.floor((BOARD_WIDTH - this.currentPiece[0].length) / 2);
        this.currentY = 0;
        
        // Generate next piece
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        this.nextPiece = SHAPES[shapeIndex];
        this.nextColor = COLORS[shapeIndex];
        
        // Draw next piece preview
        this.drawNextPiece();
        
        // Check for game over
        if (!this.isValidMove(0, 0)) {
            this.gameOver = true;
            window.soundManager.play('gameover');
        }
    }
    
    drawNextPiece() {
        // Clear next piece canvas
        this.nextCtx.fillStyle = '#000000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        // Calculate scaling to fit the preview canvas
        const blockSize = Math.min(
            (this.nextCanvas.width - 20) / this.nextPiece[0].length,
            (this.nextCanvas.height - 20) / this.nextPiece.length
        );
        
        // Calculate centering offsets
        const offsetX = (this.nextCanvas.width - (this.nextPiece[0].length * blockSize)) / 2;
        const offsetY = (this.nextCanvas.height - (this.nextPiece.length * blockSize)) / 2;
        
        // Draw next piece
        for (let y = 0; y < this.nextPiece.length; y++) {
            for (let x = 0; x < this.nextPiece[y].length; x++) {
                if (this.nextPiece[y][x]) {
                    const blockX = offsetX + (x * blockSize);
                    const blockY = offsetY + (y * blockSize);
                    
                    // Main block
                    this.nextCtx.fillStyle = this.nextColor;
                    this.nextCtx.fillRect(blockX, blockY, blockSize, blockSize);
                    
                    // Highlight
                    this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this.nextCtx.fillRect(blockX, blockY, blockSize, 2);
                    this.nextCtx.fillRect(blockX, blockY, 2, blockSize);
                    
                    // Shadow
                    this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.nextCtx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);
                    this.nextCtx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
                }
            }
        }
    }
    
    moveLeft() {
        if (this.isValidMove(-1, 0)) {
            this.currentX--;
            window.soundManager.play('move');
            return true;
        }
        return false;
    }
    
    moveRight() {
        if (this.isValidMove(1, 0)) {
            this.currentX++;
            window.soundManager.play('move');
            return true;
        }
        return false;
    }
    
    moveDown() {
        if (this.isValidMove(0, 1)) {
            this.currentY++;
            return true;
        }
        this.landPiece();
        return false;
    }
    
    rotate() {
        const rotated = this.currentPiece[0].map((_, i) =>
            this.currentPiece.map(row => row[row.length - 1 - i])
        );
        
        const prevPiece = this.currentPiece;
        this.currentPiece = rotated;
        
        // Wall kicks
        for (let offset of [0, -1, 1, -2, 2]) {
            if (this.isValidMove(offset, 0)) {
                this.currentX += offset;
                window.soundManager.play('rotate');
                return true;
            }
        }
        
        // If no valid position found, revert rotation
        this.currentPiece = prevPiece;
        return false;
    }
    
    landPiece() {
        // Add piece to board
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    this.board[this.currentY + y][this.currentX + x] = this.currentColor;
                }
            }
        }
        
        window.soundManager.play('land');
        
        // Check for completed lines
        let linesCleared = 0;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // Check the same row again
            }
        }
        
        // Update score and level
        if (linesCleared > 0) {
            this.score += linesCleared * linesCleared * 100 * this.level;
            document.getElementById('score').textContent = this.score;
            window.soundManager.play('clear');
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.score / 1000) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                document.getElementById('level').textContent = this.level;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
                window.soundManager.play('levelup');
            }
        }
        
        // Check for game over after landing
        if (this.gameOver) {
            this.addToLeaderboard();
        }
        
        // Spawn new piece
        this.spawnPiece();
    }
    
    isValidMove(offsetX, offsetY) {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    const newX = this.currentX + x + offsetX;
                    const newY = this.currentY + y + offsetY;
                    
                    if (newX < 0 || newX >= BOARD_WIDTH || 
                        newY < 0 || newY >= BOARD_HEIGHT ||
                        this.board[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    handleKeyPress(event) {
        if (this.gameOver || this.paused) return;
        
        switch (event.code) {
            case 'ArrowLeft':
                event.preventDefault();
                this.moveLeft();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveRight();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveDown();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.rotate();
                break;
            case 'Space':
                event.preventDefault();
                while (this.moveDown());
                break;
            case 'KeyP':
                this.paused = !this.paused;
                break;
            case 'KeyM':
                window.soundManager.toggleMute();
                break;
        }
    }
    
    draw() {
        if (!this.started) {
            this.drawStartScreen();
            return;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            for (let y = 0; y < this.currentPiece.length; y++) {
                for (let x = 0; x < this.currentPiece[y].length; x++) {
                    if (this.currentPiece[y][x]) {
                        this.drawBlock(this.currentX + x, this.currentY + y, this.currentColor);
                    }
                }
            }
        }
        
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '20px "One Little Font"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', 
                this.canvas.width / 2,
                this.canvas.height / 2);
            this.ctx.font = '16px "One Little Font"';
            this.ctx.fillText('Click START to play again!', 
                this.canvas.width / 2,
                this.canvas.height / 2 + 30);
            this.started = false;
        }
        
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '20px "One Little Font"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED',
                this.canvas.width / 2,
                this.canvas.height / 2);
        }
    }
    
    drawBlock(x, y, color) {
        const blockX = x * BLOCK_SIZE;
        const blockY = y * BLOCK_SIZE;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(blockX, blockY, BLOCK_SIZE, BLOCK_SIZE);
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillRect(blockX, blockY, BLOCK_SIZE, 2);
        this.ctx.fillRect(blockX, blockY, 2, BLOCK_SIZE);
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(blockX + BLOCK_SIZE - 2, blockY, 2, BLOCK_SIZE);
        this.ctx.fillRect(blockX, blockY + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
    }
    
    gameLoop() {
        if (this.started && !this.gameOver && !this.paused) {
            const now = Date.now();
            if (now - this.lastDrop > this.dropInterval) {
                this.moveDown();
                this.lastDrop = now;
            }
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    loadLeaderboard() {
        const saved = localStorage.getItem('fallingBlocksLeaderboard');
        return saved ? JSON.parse(saved) : [];
    }

    saveLeaderboard() {
        localStorage.setItem('fallingBlocksLeaderboard', JSON.stringify(this.leaderboard));
    }

    updateLeaderboardDisplay() {
        const leaderboardElement = document.getElementById('leaderboard');
        leaderboardElement.innerHTML = '<h3>Global High Scores</h3>';
        
        if (this.leaderboard.length === 0) {
            leaderboardElement.innerHTML += '<p>No scores yet!</p>';
            return;
        }

        const list = document.createElement('ol');
        this.leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_LEADERBOARD_ENTRIES)
            .forEach(entry => {
                const item = document.createElement('li');
                const name = entry.playerName || 'Anonymous';
                item.textContent = `${name} - ${entry.score} (Level ${entry.level})`;
                if (entry.playerName === this.playerName) {
                    item.style.color = '#0DFFF3';
                }
                list.appendChild(item);
            });
        leaderboardElement.appendChild(list);
    }

    addToLeaderboard() {
        this.leaderboard.push({
            playerName: this.playerName,
            score: this.score,
            level: this.level,
            date: new Date().toISOString()
        });
        
        // Sort and keep only top scores
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
        
        this.saveLeaderboard();
        this.updateLeaderboardDisplay();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    window.game = new Game(canvas);
    
    // Add start button listener
    document.getElementById('startButton').addEventListener('click', () => {
        window.game.start();
    });
}); 
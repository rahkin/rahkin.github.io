// Game Constants
const BLOCK_SIZE = 30;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const INITIAL_SPEED = 1000; // Time in ms between moves
const SPEED_INCREASE = 0.9; // Speed multiplier per level
const POINTS_PER_LINE = [0, 100, 300, 500, 800]; // Points for 0-4 lines

// Tetromino Shapes
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// Tetromino Colors
const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

// Game State
let gameState = {
    score: 0,
    level: 1,
    isPlaying: false,
    isInitialized: false,
    playerName: '',
    highScores: JSON.parse(localStorage.getItem('fallingBlocksHighScores')) || []
};

// Game Variables
let grid = [];
let currentPiece = null;
let nextPiece = null;
let dropInterval = null;
let lastDrop = 0;

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const nextCanvas = document.getElementById('nextCanvas');
const ctx = canvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

// Initialize Game
function initGame() {
    console.log('Initializing game...');

    // Initialize grid
    grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(0));

    // Setup event listeners
    setupEventListeners();

    // Show player name modal
    showModal('playerNameModal');

    // Focus the canvas
    canvas.focus();

    // Draw initial game state
    drawGame();
}

// Create a new piece
function createPiece() {
    const pieces = Object.keys(SHAPES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    
    return {
        shape: SHAPES[randomPiece],
        color: COLORS[randomPiece],
        x: Math.floor(GRID_WIDTH / 2) - Math.floor(SHAPES[randomPiece][0].length / 2),
        y: 0
    };
}

// Setup Event Listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Mobile controls
    document.getElementById('leftBtn').addEventListener('click', () => movePiece(-1, 0));
    document.getElementById('rightBtn').addEventListener('click', () => movePiece(1, 0));
    document.getElementById('downBtn').addEventListener('click', () => movePiece(0, 1));
    document.getElementById('rotateBtn').addEventListener('click', rotatePiece);
    document.getElementById('dropBtn').addEventListener('click', hardDrop);

    // Game controls
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('tutorialBtn').addEventListener('click', () => showModal('tutorialModal'));
    document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
    document.getElementById('submitName').addEventListener('click', handleNameSubmit);
    document.getElementById('playAgain').addEventListener('click', startGame);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', hideAllModals);
    });
}

// Handle Keyboard Input
function handleKeyPress(event) {
    if (!gameState.isPlaying) return;

    switch(event.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            movePiece(0, 1);
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            hardDrop();
            break;
    }
}

// Game Loop
function gameLoop(timestamp) {
    if (!gameState.isPlaying) return;

    if (timestamp - lastDrop > INITIAL_SPEED * Math.pow(SPEED_INCREASE, gameState.level - 1)) {
        movePiece(0, 1);
        lastDrop = timestamp;
    }

    drawGame();
    requestAnimationFrame(gameLoop);
}

// Start Game
function startGame() {
    console.log('Start game called');
    if (!gameState.isInitialized) {
        console.log('Game not initialized, showing name modal');
        showModal('playerNameModal');
        return;
    }

    console.log('Resetting game state');
    // Reset game state
    grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(0));
    gameState.score = 0;
    gameState.level = 1;
    updateScore();
    updateLevel();

    console.log('Creating initial pieces');
    // Create initial pieces
    currentPiece = createPiece();
    nextPiece = createPiece();

    // Start game
    gameState.isPlaying = true;
    lastDrop = performance.now();
    document.body.classList.add('playing');
    hideAllModals();
    console.log('Starting game loop');
    gameLoop(performance.now());
}

// Move Piece
function movePiece(dx, dy) {
    if (!currentPiece) return;

    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidMove(currentPiece.shape, newX, newY)) {
        currentPiece.x = newX;
        currentPiece.y = newY;
        return true;
    }

    if (dy > 0) {
        lockPiece();
    }

    return false;
}

// Rotate Piece
function rotatePiece() {
    if (!currentPiece) return;

    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    if (isValidMove(rotated, currentPiece.x, currentPiece.y)) {
        currentPiece.shape = rotated;
    }
}

// Hard Drop
function hardDrop() {
    if (!currentPiece) return;

    while (movePiece(0, 1)) {}
    lockPiece();
}

// Lock Piece
function lockPiece() {
    // Add piece to grid
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                grid[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });

    // Check for completed lines
    checkLines();

    // Create new piece
    currentPiece = nextPiece;
    nextPiece = createPiece();

    // Draw next piece preview
    drawNextPiece();

    // Check game over
    if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        gameOver();
    }
}

// Check for Completed Lines
function checkLines() {
    let linesCleared = 0;

    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== 0)) {
            grid.splice(y, 1);
            grid.unshift(Array(GRID_WIDTH).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        // Update score
        gameState.score += POINTS_PER_LINE[linesCleared];
        updateScore();

        // Check for level up
        const newLevel = Math.floor(gameState.score / 1000) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            updateLevel();
        }
    }
}

// Draw Game
function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    grid.forEach((row, y) => {
        row.forEach((color, x) => {
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        });
    });

    // Draw current piece
    if (currentPiece) {
        ctx.fillStyle = currentPiece.color;
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillRect(
                        (currentPiece.x + x) * BLOCK_SIZE,
                        (currentPiece.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
}

// Draw Next Piece Preview
function drawNextPiece() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        nextCtx.fillStyle = nextPiece.color;
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;

        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillRect(
                        offsetX + x * BLOCK_SIZE,
                        offsetY + y * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
}

// Utility Functions
function isValidMove(shape, x, y) {
    return shape.every((row, dy) =>
        row.every((value, dx) => {
            if (!value) return true;
            const newX = x + dx;
            const newY = y + dy;
            return (
                newX >= 0 &&
                newX < GRID_WIDTH &&
                newY < GRID_HEIGHT &&
                (newY < 0 || !grid[newY][newX])
            );
        })
    );
}

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
}

function updateLevel() {
    document.getElementById('level').textContent = gameState.level;
}

function gameOver() {
    gameState.isPlaying = false;
    document.body.classList.remove('playing');
    document.getElementById('finalScore').textContent = gameState.score;
    showModal('gameOverModal');
    updateHighScores();
}

function updateHighScores() {
    gameState.highScores.push({
        name: gameState.playerName,
        score: gameState.score
    });

    // Sort by score and keep top 10
    gameState.highScores.sort((a, b) => b.score - a.score);
    gameState.highScores = gameState.highScores.slice(0, 10);

    // Save to localStorage
    localStorage.setItem('fallingBlocksHighScores', JSON.stringify(gameState.highScores));
}

function showLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';

    gameState.highScores.forEach((score, index) => {
        const entry = document.createElement('div');
        entry.textContent = `${index + 1}. ${score.name}: ${score.score}`;
        leaderboardList.appendChild(entry);
    });

    showModal('leaderboardModal');
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function handleNameSubmit() {
    const nameInput = document.getElementById('playerName');
    if (nameInput.value.trim()) {
        gameState.playerName = nameInput.value.trim();
        gameState.isInitialized = true;
        hideAllModals();
        startGame();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing game...');
    try {
        initGame();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}); 
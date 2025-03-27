// Game Constants
const CELL_SIZE = 30;
const PACMAN_SPEED = 4;
const GHOST_SPEED = 2.5;
const POWER_PELLET_DURATION = 8000; // Reduced from 10000 to make power-ups more challenging
const POINT_VALUE = 10;
const POWER_PELLET_VALUE = 50;
const CHARACTER_SCALE = 1.0; // Reduced from 1.2 to keep character within bounds

// Game State
let gameState = {
    score: 0,
    isPlaying: false,
    isPoweredUp: false,
    playerName: '',
    isInitialized: false,
    highScores: JSON.parse(localStorage.getItem('highScores')) || []
};

// Load Pokka image
const pokkaImage = new Image();
pokkaImage.src = 'assets/images/pokka.png';

// Load Ghost images
const ghostImages = {
    pink: { normal: new Image(), scared: new Image() },
    blue: { normal: new Image(), scared: new Image() },
    purple: { normal: new Image(), scared: new Image() },
    skin: { normal: new Image(), scared: new Image() },
    lightPink: { normal: new Image(), scared: new Image() }
};

// Set ghost image sources
ghostImages.pink.normal.src = 'assets/images/andy.png';
ghostImages.blue.normal.src = 'assets/images/siren.png';
ghostImages.purple.normal.src = 'assets/images/aicz.png';
ghostImages.skin.normal.src = 'assets/images/banana.png';
ghostImages.lightPink.normal.src = 'assets/images/mubarak.png';

// Set scared ghost images - using aiai.png for scared state
ghostImages.pink.scared.src = 'assets/images/aiai.png';
ghostImages.blue.scared.src = 'assets/images/aiai.png';
ghostImages.purple.scared.src = 'assets/images/aiai.png';
ghostImages.skin.scared.src = 'assets/images/aiai.png';
ghostImages.lightPink.scared.src = 'assets/images/aiai.png';

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
canvas.setAttribute('tabindex', '0'); // Make canvas focusable
const ctx = canvas.getContext('2d');
let grid = [];
let pacman = { x: 0, y: 0, direction: 'none', nextDirection: 'none', speed: PACMAN_SPEED };
let ghosts = [];
let dots = [];
let powerPellets = [];

// Import sound manager
import soundManager from './assets/sounds/soundManager.js';

// Initialize Game
function initGame() {
    console.log('Initializing game...');
    
    // Set canvas size
    canvas.width = CELL_SIZE * 28;
    canvas.height = CELL_SIZE * 31;
    
    // Initialize grid
    grid = createMaze();
    
    // Initialize game objects
    initializeGameObjects();
    
    // Setup event listeners
    setupEventListeners();
    
    // Show player name modal
    showModal('playerNameModal');
    
    // Focus the canvas
    canvas.focus();

    // Draw initial game state
    drawGame();
}

// Create Maze Layout
function createMaze() {
    // Create a basic maze layout (0 = empty, 1 = wall, 2 = power pellet)
    return [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,0,0,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1],
        [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,2,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,2,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
}

// Initialize Game Objects
function initializeGameObjects() {
    // Initialize Pacman at a valid starting position
    pacman = {
        x: 14 * CELL_SIZE, // Center of the maze
        y: 23 * CELL_SIZE, // Near the bottom
        direction: 'none',  // Start with no direction
        nextDirection: 'none', // Start with no next direction
        speed: PACMAN_SPEED
    };

    // Initialize Ghosts with their corresponding images
    ghosts = [
        { x: 13 * CELL_SIZE, y: 11 * CELL_SIZE, type: 'pink', direction: 'right' },
        { x: 14 * CELL_SIZE, y: 11 * CELL_SIZE, type: 'blue', direction: 'left' },
        { x: 15 * CELL_SIZE, y: 11 * CELL_SIZE, type: 'purple', direction: 'up' },
        { x: 12 * CELL_SIZE, y: 11 * CELL_SIZE, type: 'skin', direction: 'right' },
        { x: 16 * CELL_SIZE, y: 11 * CELL_SIZE, type: 'lightPink', direction: 'left' }
    ];

    // Initialize Dots and Power Pellets
    dots = [];
    powerPellets = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 0) {
                dots.push({ x: x * CELL_SIZE, y: y * CELL_SIZE });
            } else if (grid[y][x] === 2) {
                powerPellets.push({ x: x * CELL_SIZE, y: y * CELL_SIZE });
            }
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Keyboard controls
    canvas.addEventListener('keydown', handleKeyPress);
    
    // Mobile controls
    document.getElementById('upBtn').addEventListener('click', () => {
        handleDirection('up');
        canvas.focus(); // Focus canvas when mobile controls are used
    });
    document.getElementById('downBtn').addEventListener('click', () => {
        handleDirection('down');
        canvas.focus();
    });
    document.getElementById('leftBtn').addEventListener('click', () => {
        handleDirection('left');
        canvas.focus();
    });
    document.getElementById('rightBtn').addEventListener('click', () => {
        handleDirection('right');
        canvas.focus();
    });
    
    // Menu buttons
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('tutorialBtn').addEventListener('click', () => showModal('tutorialModal'));
    document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
    
    // Modal buttons
    document.getElementById('submitName').addEventListener('click', handleNameSubmit);
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => hideAllModals());
    });
    document.getElementById('playAgain').addEventListener('click', startGame);

    // Add click handler to canvas to ensure focus
    canvas.addEventListener('click', () => {
        canvas.focus();
    });
    
    // Add focus handler to show/hide the message
    canvas.addEventListener('focus', () => {
        // Force a redraw to remove the message
        if (gameState.isPlaying) {
            drawGame();
        }
    });
    
    // Handle focus for the whole window
    window.addEventListener('keydown', (event) => {
        // If a game control key is pressed and canvas isn't focused
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && 
            document.activeElement !== canvas) {
            canvas.focus();
        }
    });
}

// Handle Keyboard Input
function handleKeyPress(event) {
    // Prevent default browser behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Only process movement if game is playing
    if (!gameState.isPlaying) {
        return;
    }
    
    switch(event.key) {
        case 'ArrowUp':
            console.log('Moving up');
            handleDirection('up');
            break;
        case 'ArrowDown':
            console.log('Moving down');
            handleDirection('down');
            break;
        case 'ArrowLeft':
            console.log('Moving left');
            handleDirection('left');
            break;
        case 'ArrowRight':
            console.log('Moving right');
            handleDirection('right');
            break;
    }
}

// Handle Direction Changes
function handleDirection(direction) {
    console.log('Handling direction change to:', direction);
    pacman.nextDirection = direction;
}

// Start Game
function startGame() {
    // Check if player name is set
    if (!gameState.playerName) {
        showModal('playerNameModal');
        return;
    }

    console.log('Starting game...');
    hideAllModals();
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.isPoweredUp = false;
    updateScore();
    initializeGameObjects();
    
    // Automatically focus the canvas when game starts
    canvas.focus();
    
    // Start the game loop
    console.log('Starting game loop...');
    requestAnimationFrame(function gameLoop() {
        if (!gameState.isPlaying) return;
        
        updateGame();
        drawGame();
        
        // Check if canvas has focus and show message if it doesn't
        if (document.activeElement !== canvas) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
            ctx.fillStyle = '#ff9ec5';
            ctx.font = '16px "One Little Font"';
            ctx.textAlign = 'center';
            ctx.fillText('Click here to control Pokka!', canvas.width / 2, canvas.height - 15);
        }
        
        requestAnimationFrame(gameLoop);
    });

    // Play background music
    soundManager.playBackground();
}

// Update Game State
function updateGame() {
    console.log('Updating game state...');
    console.log('Before update - Pacman:', 
        'x:', pacman.x, 
        'y:', pacman.y, 
        'direction:', pacman.direction, 
        'nextDirection:', pacman.nextDirection
    );
    
    updatePacman();
    updateGhosts();
    checkCollisions();
    
    console.log('After update - Pacman:', 
        'x:', pacman.x, 
        'y:', pacman.y, 
        'direction:', pacman.direction, 
        'nextDirection:', pacman.nextDirection
    );
}

// Update Pacman Position
function updatePacman() {
    // If no direction is set, don't move
    if (pacman.direction === 'none' && pacman.nextDirection === 'none') {
        return;
    }

    const speed = pacman.speed;
    let nextX = pacman.x;
    let nextY = pacman.y;

    // Helper function to check if a position is valid (not a wall)
    function isValidPosition(x, y) {
        // Check all four corners and the center point
        const points = [
            { x: x + CELL_SIZE * 0.2, y: y + CELL_SIZE * 0.2 },             // Top-left
            { x: x + CELL_SIZE * 0.8, y: y + CELL_SIZE * 0.2 },             // Top-right
            { x: x + CELL_SIZE * 0.2, y: y + CELL_SIZE * 0.8 },             // Bottom-left
            { x: x + CELL_SIZE * 0.8, y: y + CELL_SIZE * 0.8 },             // Bottom-right
            { x: x + CELL_SIZE * 0.5, y: y + CELL_SIZE * 0.5 }              // Center
        ];

        return points.every(point => {
            const gridX = Math.floor(point.x / CELL_SIZE);
            const gridY = Math.floor(point.y / CELL_SIZE);
            
            return gridX >= 0 && gridX < grid[0].length &&
                   gridY >= 0 && gridY < grid.length &&
                   grid[gridY][gridX] !== 1;
        });
    }

    // Try to move in the next direction if it's different from current
    if (pacman.nextDirection !== 'none') {
        let testX = pacman.x;
        let testY = pacman.y;
        
        // Calculate test position in next direction
        switch (pacman.nextDirection) {
            case 'right':
                testX += speed;
                break;
            case 'left':
                testX -= speed;
                break;
            case 'down':
                testY += speed;
                break;
            case 'up':
                testY -= speed;
                break;
        }
        
        // If we can move in the next direction, change direction
        if (isValidPosition(testX, testY)) {
            pacman.direction = pacman.nextDirection;
            nextX = testX;
            nextY = testY;
        }
        // If we can't move in the next direction, try continuing in current direction
        else if (pacman.direction !== 'none') {
            switch (pacman.direction) {
                case 'right':
                    nextX += speed;
                    break;
                case 'left':
                    nextX -= speed;
                    break;
                case 'down':
                    nextY += speed;
                    break;
                case 'up':
                    nextY -= speed;
                    break;
            }
        }
    }
    // If no next direction, continue in current direction
    else if (pacman.direction !== 'none') {
        switch (pacman.direction) {
            case 'right':
                nextX += speed;
                break;
            case 'left':
                nextX -= speed;
                break;
            case 'down':
                nextY += speed;
                break;
            case 'up':
                nextY -= speed;
                break;
        }
    }
    
    // Move if the next position is valid
    if (isValidPosition(nextX, nextY)) {
        pacman.x = nextX;
        pacman.y = nextY;
        
        // Handle tunnel wrapping
        if (pacman.x < -CELL_SIZE) {
            pacman.x = canvas.width;
        } else if (pacman.x > canvas.width) {
            pacman.x = -CELL_SIZE;
        }
        
        checkDotCollision();
    }
    // If we can't move, try to align to grid
    else {
        // Align to grid in current direction
        const gridX = Math.round(pacman.x / CELL_SIZE) * CELL_SIZE;
        const gridY = Math.round(pacman.y / CELL_SIZE) * CELL_SIZE;
        
        if (Math.abs(pacman.x - gridX) < speed) pacman.x = gridX;
        if (Math.abs(pacman.y - gridY) < speed) pacman.y = gridY;
    }
}

// Update Ghosts
function updateGhosts() {
    ghosts.forEach(ghost => {
        // Ghosts are slightly faster when not powered up, and slower when scared
        const speed = gameState.isPoweredUp ? GHOST_SPEED * 0.6 : GHOST_SPEED;
        
        // Get current grid position
        const gridX = Math.floor(ghost.x / CELL_SIZE);
        const gridY = Math.floor(ghost.y / CELL_SIZE);
        
        // Check if ghost is at grid center (with tighter tolerance for better cornering)
        const atGridCenter = Math.abs(ghost.x - gridX * CELL_SIZE) < speed * 0.8 &&
                           Math.abs(ghost.y - gridY * CELL_SIZE) < speed * 0.8;
        
        if (atGridCenter) {
            // Snap to grid for precise movement
            ghost.x = gridX * CELL_SIZE;
            ghost.y = gridY * CELL_SIZE;
            
            // Get available directions
            const directions = [];
            if (gridY > 0 && grid[gridY - 1][gridX] !== 1) directions.push('up');
            if (gridY < grid.length - 1 && grid[gridY + 1][gridX] !== 1) directions.push('down');
            if (gridX > 0 && grid[gridY][gridX - 1] !== 1) directions.push('left');
            if (gridX < grid[0].length - 1 && grid[gridY][gridX + 1] !== 1) directions.push('right');
            
            // Remove opposite direction unless it's the only option (prevent back-and-forth)
            const opposite = {
                'up': 'down', 'down': 'up',
                'left': 'right', 'right': 'left'
            };
            const filteredDirections = directions.filter(dir => dir !== opposite[ghost.direction]);
            
            if (gameState.isPoweredUp && filteredDirections.length > 0) {
                // When scared, use smarter escape logic
                const pacmanGridX = Math.floor(pacman.x / CELL_SIZE);
                const pacmanGridY = Math.floor(pacman.y / CELL_SIZE);
                
                // Calculate escape routes considering multiple factors
                const bestDirections = filteredDirections.map(dir => {
                    let newX = gridX;
                    let newY = gridY;
                    switch(dir) {
                        case 'up': newY--; break;
                        case 'down': newY++; break;
                        case 'left': newX--; break;
                        case 'right': newX++; break;
                    }
                    
                    // Consider both distance and available escape routes
                    const distance = Math.abs(newX - pacmanGridX) + Math.abs(newY - pacmanGridY);
                    const escapeOptions = countEscapeRoutes(newX, newY);
                    
                    return {
                        dir,
                        score: distance + escapeOptions * 2 // Weight escape routes more heavily
                    };
                }).sort((a, b) => b.score - a.score);
                
                ghost.direction = bestDirections[0].dir;
            } else if (filteredDirections.length > 0) {
                // Normal movement: smarter chase behavior
                const pacmanGridX = Math.floor(pacman.x / CELL_SIZE);
                const pacmanGridY = Math.floor(pacman.y / CELL_SIZE);
                
                // Predict Pacman's movement
                const pacmanDirection = pacman.direction;
                let targetX = pacmanGridX;
                let targetY = pacmanGridY;
                
                // Look ahead 2 cells in Pacman's direction
                if (pacmanDirection !== 'none') {
                    switch(pacmanDirection) {
                        case 'up': targetY -= 2; break;
                        case 'down': targetY += 2; break;
                        case 'left': targetX -= 2; break;
                        case 'right': targetX += 2; break;
                    }
                }
                
                // Calculate best direction considering prediction
                const bestDirections = filteredDirections.map(dir => {
                    let newX = gridX;
                    let newY = gridY;
                    switch(dir) {
                        case 'up': newY--; break;
                        case 'down': newY++; break;
                        case 'left': newX--; break;
                        case 'right': newX++; break;
                    }
                    
                    // Consider both current position and predicted position
                    const currentDistance = Math.abs(newX - pacmanGridX) + Math.abs(newY - pacmanGridY);
                    const predictedDistance = Math.abs(newX - targetX) + Math.abs(newY - targetY);
                    
                    return {
                        dir,
                        score: -(currentDistance * 0.7 + predictedDistance * 0.3) // Weight current position more
                    };
                }).sort((a, b) => b.score - a.score);
                
                // 90% chance to choose the best direction, 10% chance for second best
                if (Math.random() < 0.9 || bestDirections.length === 1) {
                    ghost.direction = bestDirections[0].dir;
                } else {
                    ghost.direction = bestDirections[1].dir;
                }
            } else if (directions.length > 0) {
                // If no filtered directions, use any available direction
                ghost.direction = directions[Math.floor(Math.random() * directions.length)];
            }
        }
        
        // Move ghost in current direction with smoother movement
        switch (ghost.direction) {
            case 'up':
                ghost.y -= speed;
                break;
            case 'down':
                ghost.y += speed;
                break;
            case 'left':
                ghost.x -= speed;
                break;
            case 'right':
                ghost.x += speed;
                break;
        }
        
        // Handle tunnel wrapping with smoother transition
        if (ghost.x < -CELL_SIZE) {
            ghost.x = canvas.width;
        } else if (ghost.x > canvas.width) {
            ghost.x = -CELL_SIZE;
        }
    });
}

// Helper function to count available escape routes from a position
function countEscapeRoutes(x, y) {
    let count = 0;
    if (y > 0 && grid[y - 1][x] !== 1) count++;
    if (y < grid.length - 1 && grid[y + 1][x] !== 1) count++;
    if (x > 0 && grid[y][x - 1] !== 1) count++;
    if (x < grid[0].length - 1 && grid[y][x + 1] !== 1) count++;
    return count;
}

// Check Collisions
function checkCollisions() {
    // Check ghost collisions
    ghosts.forEach(ghost => {
        if (isColliding(pacman, ghost)) {
            if (gameState.isPoweredUp) {
                // Eat ghost
                ghost.x = 14 * CELL_SIZE;
                ghost.y = 11 * CELL_SIZE;
                gameState.score += 200;
                updateScore();
                soundManager.playGhostEaten();
            } else {
                soundManager.playDeath();
                gameOver();
            }
        }
    });
}

// Check Dot Collisions
function checkDotCollision() {
    // Check regular dots
    dots = dots.filter(dot => {
        if (isColliding(pacman, dot)) {
            gameState.score += POINT_VALUE;
            updateScore();
            soundManager.playChomp();
            return false;
        }
        return true;
    });
    
    // Check power pellets
    powerPellets = powerPellets.filter(pellet => {
        if (isColliding(pacman, pellet)) {
            gameState.score += POWER_PELLET_VALUE;
            updateScore();
            activatePowerUp();
            soundManager.playPowerUp();
            return false;
        }
        return true;
    });
    
    // Check win condition
    if (dots.length === 0 && powerPellets.length === 0) {
        gameWin();
    }
}

// Activate Power Up
function activatePowerUp() {
    gameState.isPoweredUp = true;
    
    // Make ghosts scared
    ghosts.forEach(ghost => {
        ghost.color = '#b49fda'; // Change to purple when scared
    });
    
    // Set timeout to end power up
    setTimeout(() => {
        gameState.isPoweredUp = false;
        // Return ghosts to normal
        ghosts.forEach(ghost => {
            ghost.color = ghost.originalColor;
        });
    }, POWER_PELLET_DURATION);
}

// Draw Game
function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw maze
    drawMaze();
    
    if (gameState.isPlaying) {
        // Draw game elements only if game is playing
        drawDots();
        drawPowerPellets();
        drawGhosts();
        drawPacman();
    } else if (gameState.isInitialized) {
        // Draw "Press Start to Play" message
        ctx.fillStyle = '#ff9ec5';
        ctx.font = '20px "One Little Font"';
        ctx.textAlign = 'center';
        ctx.fillText('Press Start to Play', canvas.width / 2, canvas.height / 2);
    }
}

// Draw Maze
function drawMaze() {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 1) {
                ctx.fillStyle = '#ff9ec5';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

// Draw Dots
function drawDots() {
    ctx.fillStyle = '#ff69b4';
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x + CELL_SIZE/2, dot.y + CELL_SIZE/2, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw Power Pellets
function drawPowerPellets() {
    ctx.fillStyle = '#ffffff';
    powerPellets.forEach(pellet => {
        ctx.beginPath();
        ctx.arc(pellet.x + CELL_SIZE/2, pellet.y + CELL_SIZE/2, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff9ec5';
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// Draw Ghosts
function drawGhosts() {
    ghosts.forEach(ghost => {
        const ghostImage = gameState.isPoweredUp ? 
            ghostImages[ghost.type].scared : 
            ghostImages[ghost.type].normal;

        if (ghostImage.complete) {
            ctx.drawImage(
                ghostImage,
                ghost.x,
                ghost.y,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    });
}

// Draw Pacman
function drawPacman() {
    if (pokkaImage.complete) {
        const size = CELL_SIZE * CHARACTER_SCALE;
        ctx.drawImage(
            pokkaImage,
            pacman.x,
            pacman.y,
            size,
            size
        );
    }
}

// Utility Functions
function isColliding(obj1, obj2) {
    const hitboxSize = CELL_SIZE * 0.8; // Smaller hitbox for better collision detection
    const offset = (CELL_SIZE - hitboxSize) / 2;
    
    return (obj1.x + offset) < (obj2.x + CELL_SIZE) &&
           (obj1.x + offset + hitboxSize) > obj2.x &&
           (obj1.y + offset) < (obj2.y + CELL_SIZE) &&
           (obj1.y + offset + hitboxSize) > obj2.y;
}

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('score').classList.add('score-update');
    setTimeout(() => {
        document.getElementById('score').classList.remove('score-update');
    }, 300);
}

function gameOver() {
    gameState.isPlaying = false;
    soundManager.stopBackground();
    soundManager.playGameOver();
    document.getElementById('finalScore').textContent = gameState.score;
    showModal('gameOverModal');
    updateHighScores();
}

function gameWin() {
    gameState.isPlaying = false;
    soundManager.stopBackground();
    soundManager.playWin();
    gameState.score += 1000; // Bonus for completing the level
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
    localStorage.setItem('highScores', JSON.stringify(gameState.highScores));
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
        hideAllModals();
        gameState.isInitialized = true;
        // Draw the initial game state without starting
        drawGame();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing game...');
    initGame();
}); 
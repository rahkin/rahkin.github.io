// Game constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BUBBLE_RADIUS = 20;
const BUBBLE_SPACING = BUBBLE_RADIUS * 2.0; // Exact diameter spacing
const SHOOTER_HEIGHT = 60;
const COLORS = [
    '#FF0D0D', // red
    '#0DFF1D', // green
    '#0D85FF', // blue
    '#FFD90D', // yellow
    '#FF0DFF', // magenta
];
const GRID_ROWS = 9;
const GRID_COLS = 15;
const SHOOT_SPEED = 10;
const MAX_ANGLE = Math.PI;
const COLLISION_THRESHOLD = BUBBLE_RADIUS * 2.0; // Exact diameter for collision

class Game {
    constructor(canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('Invalid canvas element');
            return;
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        if (!this.ctx) {
            console.error('Could not get 2D context');
            return;
        }
        
        // Set canvas size
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        
        // Scale up the canvas display size while maintaining internal resolution
        this.canvas.style.width = (CANVAS_WIDTH * 1.2) + 'px';
        this.canvas.style.height = (CANVAS_HEIGHT * 1.2) + 'px';
        
        // Game state
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.started = false;
        
        // Shooter state - centered in wider canvas
        this.shooterAngle = Math.PI / 2;
        this.shooterX = CANVAS_WIDTH / 2;
        this.shooterY = CANVAS_HEIGHT - SHOOTER_HEIGHT;
        
        // Initialize bubbles
        this.bubbles = [];
        this.activeBubble = null;
        this.currentBubble = null;
        this.nextBubble = null;
        
        // Mouse/touch state
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeyPress);
        
        // Initialize game
        this.init();
        
        // Start game loop
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
        
        console.log('Game instance created successfully');
    }
    
    init() {
        // Initialize bubble grid - fill more rows initially
        for (let row = 0; row < Math.floor(GRID_ROWS * 0.5); row++) { // Fill 50% of rows
            for (let col = 0; col < GRID_COLS; col++) {
                // Calculate position with proper offset for odd rows
                const x = col * BUBBLE_SPACING + BUBBLE_RADIUS + (row % 2 ? BUBBLE_RADIUS : 0);
                const y = row * (BUBBLE_SPACING * 0.866) + BUBBLE_RADIUS; // 0.866 = sin(60°)
                
                // Only add bubble if it fits within canvas width
                if (x + BUBBLE_RADIUS <= CANVAS_WIDTH) {
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    this.bubbles.push({
                        x,
                        y,
                        color,
                        row,
                        col
                    });
                }
            }
        }
        
        // Initialize shooter bubbles
        this.currentBubble = {
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: this.shooterX,
            y: this.shooterY
        };
        
        this.nextBubble = {
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;
        
        // Calculate angle between shooter and mouse position
        const dx = this.mouseX - this.shooterX;
        const dy = this.mouseY - this.shooterY;
        let angle = Math.PI/2 - Math.atan2(-dy, dx);
        
        // Clamp angle between -PI/3 (-60 degrees) and PI/3 (60 degrees)
        this.shooterAngle = Math.max(-Math.PI/3, Math.min(Math.PI/3, angle));
    }
    
    handleClick(e) {
        e.preventDefault();
        console.log('Click handled, game state:', {
            started: this.started,
            gameOver: this.gameOver,
            activeBubble: !!this.activeBubble
        });
        
        if (!this.started || this.gameOver) {
            this.start();
            return;
        }
        
        if (!this.activeBubble) {
            this.shootBubble();
        }
    }
    
    handleKeyPress(e) {
        if (this.gameOver) return;
        
        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                this.shooterAngle = Math.max(this.shooterAngle - 0.1, -Math.PI/3);  // Moving left decreases angle
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.shooterAngle = Math.min(this.shooterAngle + 0.1, Math.PI/3);  // Moving right increases angle
                break;
            case 'Space':
                e.preventDefault();
                if (!this.activeBubble) {
                    this.shootBubble();
                }
                break;
            case 'KeyP':
                this.paused = !this.paused;
                break;
        }
    }
    
    shootBubble() {
        if (!this.started || this.gameOver || this.paused) return;
        
        console.log('Shooting bubble at angle:', this.shooterAngle);
        const angle = Math.PI/2 - this.shooterAngle; // Convert to standard angle
        this.activeBubble = {
            x: this.shooterX,
            y: this.shooterY,
            color: this.currentBubble.color,
            dx: Math.cos(angle) * SHOOT_SPEED,
            dy: -Math.sin(angle) * SHOOT_SPEED
        };
        
        // Update current and next bubbles
        this.currentBubble.color = this.nextBubble.color;
        this.nextBubble.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    
    update() {
        if (this.gameOver || this.paused || !this.started) return;
        
        if (this.activeBubble) {
            // Calculate next position
            const nextX = this.activeBubble.x + this.activeBubble.dx;
            const nextY = this.activeBubble.y + this.activeBubble.dy;
            
            // Check ceiling collision first
            if (nextY <= BUBBLE_RADIUS) {
                // Snap to ceiling
                this.activeBubble.y = BUBBLE_RADIUS;
                this.snapBubbleToGrid(true);
                return;
            }
            
            // Check wall collisions
            if (nextX <= BUBBLE_RADIUS || nextX >= CANVAS_WIDTH - BUBBLE_RADIUS) {
                this.activeBubble.dx *= -1; // Reverse direction
                this.activeBubble.x = Math.max(BUBBLE_RADIUS, 
                    Math.min(CANVAS_WIDTH - BUBBLE_RADIUS, nextX));
                this.activeBubble.y = nextY;
                return;
            }
            
            // Check if bubble went too far down
            if (nextY > CANVAS_HEIGHT) {
                this.activeBubble = null;
                return;
            }
            
            // Check collisions with other bubbles
            let collision = false;
            let closestBubble = null;
            let minDistance = Infinity;
            
            // Check collisions at the next position
            for (const bubble of this.bubbles) {
                const dx = nextX - bubble.x;
                const dy = nextY - bubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestBubble = bubble;
                }
                
                // Check if we're about to collide (distance is less than diameter)
                if (distance <= COLLISION_THRESHOLD) {
                    collision = true;
                    break;
                }
            }
            
            if (collision && closestBubble) {
                // Move to exact touching position
                const dx = nextX - closestBubble.x;
                const dy = nextY - closestBubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                // Calculate the exact position where bubbles touch
                const touchX = closestBubble.x + Math.cos(angle) * COLLISION_THRESHOLD;
                const touchY = closestBubble.y + Math.sin(angle) * COLLISION_THRESHOLD;
                
                // Set position and snap to grid
                this.activeBubble.x = touchX;
                this.activeBubble.y = touchY;
                this.snapBubbleToGrid(false);
            } else {
                // No collision, update position
                this.activeBubble.x = nextX;
                this.activeBubble.y = nextY;
            }
        }
        
        // Check for game over (bubbles too low)
        const lowestBubble = Math.max(...this.bubbles.map(b => b.y));
        if (lowestBubble > CANVAS_HEIGHT - SHOOTER_HEIGHT - BUBBLE_RADIUS * 2) {
            this.gameOver = true;
        }
    }
    
    snapBubbleToGrid(isCeilingCollision = false) {
        if (isCeilingCollision) {
            // For ceiling collisions, simply snap to the nearest column
            const col = Math.round(this.activeBubble.x / BUBBLE_SPACING);
            const x = col * BUBBLE_SPACING + BUBBLE_RADIUS;
            
            this.bubbles.push({
                x,
                y: BUBBLE_RADIUS,
                color: this.activeBubble.color,
                row: 0,
                col
            });
            
            this.checkMatches();
            this.activeBubble = null;
            return;
        }
        
        // For bubble collisions, find the nearest valid grid position
        const row = Math.round(this.activeBubble.y / (BUBBLE_SPACING * 0.866));
        const isOddRow = row % 2 === 1;
        const col = Math.round((this.activeBubble.x - (isOddRow ? BUBBLE_RADIUS : 0)) / BUBBLE_SPACING);
        
        // Validate position
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
            // If invalid, force to nearest valid position
            const validRow = Math.max(0, Math.min(row, GRID_ROWS - 1));
            const validCol = Math.max(0, Math.min(col, GRID_COLS - 1));
            
            const x = validCol * BUBBLE_SPACING + BUBBLE_RADIUS + (validRow % 2 ? BUBBLE_RADIUS : 0);
            const y = validRow * (BUBBLE_SPACING * 0.866) + BUBBLE_RADIUS;
            
            this.bubbles.push({
                x,
                y,
                color: this.activeBubble.color,
                row: validRow,
                col: validCol
            });
        } else {
            // Position is valid, use calculated position
            const x = col * BUBBLE_SPACING + BUBBLE_RADIUS + (isOddRow ? BUBBLE_RADIUS : 0);
            const y = row * (BUBBLE_SPACING * 0.866) + BUBBLE_RADIUS;
            
            this.bubbles.push({
                x,
                y,
                color: this.activeBubble.color,
                row,
                col
            });
        }
        
        this.checkMatches();
        this.activeBubble = null;
    }
    
    getNeighbors(bubble) {
        const neighbors = [];
        // Define directions based on row parity (odd/even)
        const directions = bubble.row % 2 === 0 ? 
            [ // Even row
                [-1,-1], [0,-1], [1,-1],  // Above
                [-1,0], [1,0],            // Same row
                [-1,1], [0,1], [1,1]      // Below
            ] : [ // Odd row
                [0,-1], [1,-1],           // Above
                [-1,0], [1,0],            // Same row
                [0,1], [1,1]              // Below
            ];
        
        for (const [dx, dy] of directions) {
            const newRow = bubble.row + dy;
            const newCol = bubble.col + dx;
            
            // Skip if outside grid
            if (newRow < 0 || newRow >= GRID_ROWS || 
                newCol < 0 || newCol >= GRID_COLS) {
                continue;
            }
            
            // Find any bubble at these coordinates
            const neighbor = this.bubbles.find(b => 
                b.row === newRow && b.col === newCol
            );
            
            if (neighbor) {
                // Verify physical distance
                const dx = bubble.x - neighbor.x;
                const dy = bubble.y - neighbor.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= BUBBLE_SPACING * 1.1) {
                    neighbors.push(neighbor);
                }
            }
        }
        
        return neighbors;
    }
    
    checkMatches() {
        const matches = new Set();
        const lastBubble = this.bubbles[this.bubbles.length - 1];
        
        console.log('Checking matches for bubble:', {
            color: lastBubble.color,
            row: lastBubble.row,
            col: lastBubble.col
        });
        
        // Find all matching neighbors recursively
        const findMatches = (bubble, color, visited = new Set()) => {
            const key = `${bubble.row},${bubble.col}`;
            if (visited.has(key)) return;
            visited.add(key);
            
            if (bubble.color === color) {
                matches.add(key);
                
                // Get all neighbors
                const neighbors = this.getNeighbors(bubble);
                console.log('Found neighbors:', neighbors.length);
                
                // Only continue with matching color neighbors
                for (const neighbor of neighbors) {
                    if (neighbor.color === color) {
                        findMatches(neighbor, color, visited);
                    }
                }
            }
        };
        
        // Start matching from the last placed bubble
        findMatches(lastBubble, lastBubble.color);
        
        console.log('Total matches found:', matches.size);
        
        // Remove matches if there are 3 or more
        if (matches.size >= 3) {
            console.log('Removing matched bubbles');
            this.bubbles = this.bubbles.filter(bubble => {
                const key = `${bubble.row},${bubble.col}`;
                const isMatch = !matches.has(key);
                if (!isMatch) {
                    console.log('Removing bubble:', {
                        row: bubble.row,
                        col: bubble.col,
                        color: bubble.color
                    });
                }
                return isMatch;
            });
            
            // Update score
            this.score += matches.size * 100;
            
            // Check for floating bubbles
            this.removeFloatingBubbles();
        }
    }
    
    removeFloatingBubbles() {
        // Find all bubbles connected to the top
        const connected = new Set();
        const visited = new Set();
        
        const findConnected = (bubble) => {
            const key = `${bubble.row},${bubble.col}`;
            if (visited.has(key)) return;
            
            visited.add(key);
            connected.add(key);
            
            // Check all neighbors regardless of color
            const neighbors = this.getNeighbors(bubble);
            for (const neighbor of neighbors) {
                findConnected(neighbor);
            }
        };
        
        // Start from top row bubbles
        for (const bubble of this.bubbles) {
            if (bubble.row === 0) {
                findConnected(bubble);
            }
        }
        
        // Remove unconnected bubbles
        this.bubbles = this.bubbles.filter(bubble => 
            connected.has(`${bubble.row},${bubble.col}`)
        );
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        if (!this.started) {
            this.drawStartScreen();
            return;
        }
        
        // Draw bubbles
        for (const bubble of this.bubbles) {
            this.drawBubble(bubble.x, bubble.y, bubble.color);
        }
        
        // Draw active bubble
        if (this.activeBubble) {
            this.drawBubble(
                this.activeBubble.x,
                this.activeBubble.y,
                this.activeBubble.color
            );
        }
        
        // Draw shooter
        this.drawShooter();
        
        // Draw next bubble preview
        this.drawBubble(
            this.shooterX - BUBBLE_RADIUS * 3,
            this.shooterY,
            this.nextBubble.color
        );
        
        // Draw score
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px "One Little Font"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        // Draw game over screen
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '30px "One Little Font"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'GAME OVER',
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2
            );
            this.ctx.font = '20px "One Little Font"';
            this.ctx.fillText(
                `Final Score: ${this.score}`,
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2 + 40
            );
            this.ctx.fillText(
                'Click to play again',
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2 + 80
            );
        }
        
        // Draw pause screen
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '30px "One Little Font"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'PAUSED',
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2
            );
        }
    }
    
    drawStartScreen() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '30px "One Little Font"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            "POKKA'S",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 3
        );
        this.ctx.fillText(
            'BUBBLE SHOOTER',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 3 + 40
        );
        
        this.ctx.font = '20px "One Little Font"';
        this.ctx.fillText(
            'Click START to play!',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 40
        );
        
        this.ctx.font = '16px "One Little Font"';
        this.ctx.fillText(
            'Use mouse or arrow keys to aim',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 80
        );
        this.ctx.fillText(
            'Click or press Space to shoot',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 100
        );
    }
    
    drawBubble(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Add shine effect
        this.ctx.beginPath();
        this.ctx.arc(x - BUBBLE_RADIUS/3, y - BUBBLE_RADIUS/3, BUBBLE_RADIUS/4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
    }
    
    drawShooter() {
        // Draw shooter base
        this.ctx.beginPath();
        this.ctx.arc(this.shooterX, this.shooterY, BUBBLE_RADIUS, 0, Math.PI * 2);
        this.ctx.fillStyle = '#666666';
        this.ctx.fill();
        
        // Draw aiming line
        this.ctx.beginPath();
        this.ctx.moveTo(this.shooterX, this.shooterY);
        const angle = Math.PI/2 - this.shooterAngle; // Convert to standard angle
        this.ctx.lineTo(
            this.shooterX + Math.cos(angle) * SHOOTER_HEIGHT,
            this.shooterY - Math.sin(angle) * SHOOTER_HEIGHT
        );
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw current bubble
        this.drawBubble(this.shooterX, this.shooterY, this.currentBubble.color);
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
    
    start() {
        console.log('Starting game...');
        try {
            this.started = true;
            this.gameOver = false;
            this.score = 0;
            this.bubbles = [];
            this.activeBubble = null;
            
            // Reset shooter state to straight up (PI/2)
            this.shooterAngle = Math.PI / 2;
            this.currentBubble = {
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                x: this.shooterX,
                y: this.shooterY
            };
            this.nextBubble = {
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            };
            
            // Initialize bubble grid
            this.init();
            console.log('Game started successfully');
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }
}
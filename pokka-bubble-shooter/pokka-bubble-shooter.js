// Game constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BUBBLE_RADIUS = 20;
const SHOOTER_HEIGHT = 60;
const COLORS = [
    '#FF0D0D', // red
    '#0DFF1D', // green
    '#0D85FF', // blue
    '#FFD90D', // yellow
    '#FF0DFF', // magenta
];
const GRID_ROWS = 8;
const GRID_COLS = 8;
const SHOOT_SPEED = 10;
const MAX_ANGLE = Math.PI;

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
        this.canvas.style.width = (CANVAS_WIDTH * 1.5) + 'px';
        this.canvas.style.height = (CANVAS_HEIGHT * 1.5) + 'px';
        
        // Game state
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.started = false;
        
        // Shooter state
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
        // Initialize bubble grid
        for (let row = 0; row < GRID_ROWS / 2; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * (BUBBLE_RADIUS * 2) + BUBBLE_RADIUS + (row % 2 ? BUBBLE_RADIUS : 0);
                const y = row * (BUBBLE_RADIUS * 2) + BUBBLE_RADIUS;
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
        this.shooterAngle = Math.atan2(-dy, dx);
        
        // Clamp angle between PI/2 (90 degrees) and 4PI/3 (240 degrees)
        this.shooterAngle = Math.max(Math.PI/2, Math.min(4*Math.PI/3, this.shooterAngle));
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
                this.shooterAngle = Math.min(this.shooterAngle + 0.1, 4*Math.PI/3);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.shooterAngle = Math.max(this.shooterAngle - 0.1, Math.PI/2);
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
        this.activeBubble = {
            x: this.shooterX,
            y: this.shooterY,
            color: this.currentBubble.color,
            dx: Math.sin(this.shooterAngle) * SHOOT_SPEED,
            dy: -Math.cos(this.shooterAngle) * SHOOT_SPEED
        };
        
        // Update current and next bubbles
        this.currentBubble.color = this.nextBubble.color;
        this.nextBubble.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    
    update() {
        if (this.gameOver || this.paused || !this.started) return;
        
        if (this.activeBubble) {
            // Update bubble position
            this.activeBubble.x += this.activeBubble.dx;
            this.activeBubble.y += this.activeBubble.dy;
            
            // Check wall collisions
            if (this.activeBubble.x <= BUBBLE_RADIUS || 
                this.activeBubble.x >= CANVAS_WIDTH - BUBBLE_RADIUS) {
                this.activeBubble.dx *= -1;
            }
            
            // Check ceiling collision
            if (this.activeBubble.y <= BUBBLE_RADIUS) {
                this.snapBubbleToGrid();
            }
            
            // Check collisions with other bubbles
            for (const bubble of this.bubbles) {
                const dx = this.activeBubble.x - bubble.x;
                const dy = this.activeBubble.y - bubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < BUBBLE_RADIUS * 2) {
                    this.snapBubbleToGrid();
                    break;
                }
            }
        }
        
        // Check for game over (bubbles too low)
        const lowestBubble = Math.max(...this.bubbles.map(b => b.y));
        if (lowestBubble > CANVAS_HEIGHT - SHOOTER_HEIGHT - BUBBLE_RADIUS * 2) {
            this.gameOver = true;
        }
    }
    
    snapBubbleToGrid() {
        // Find nearest grid position
        const col = Math.round(this.activeBubble.x / (BUBBLE_RADIUS * 2));
        const row = Math.round(this.activeBubble.y / (BUBBLE_RADIUS * 2));
        
        // Add bubble to grid
        this.bubbles.push({
            x: col * (BUBBLE_RADIUS * 2) + BUBBLE_RADIUS + (row % 2 ? BUBBLE_RADIUS : 0),
            y: row * (BUBBLE_RADIUS * 2) + BUBBLE_RADIUS,
            color: this.activeBubble.color,
            row,
            col
        });
        
        // Check for matches
        this.checkMatches();
        
        // Clear active bubble
        this.activeBubble = null;
    }
    
    checkMatches() {
        const matches = new Set();
        const lastBubble = this.bubbles[this.bubbles.length - 1];
        
        // Find all matching neighbors recursively
        const findMatches = (bubble, color, visited = new Set()) => {
            const key = `${bubble.row},${bubble.col}`;
            if (visited.has(key)) return;
            
            visited.add(key);
            if (bubble.color !== color) return;
            
            matches.add(key);
            
            // Check neighbors
            const neighbors = this.getNeighbors(bubble);
            for (const neighbor of neighbors) {
                findMatches(neighbor, color, visited);
            }
        };
        
        findMatches(lastBubble, lastBubble.color);
        
        // Remove matches if there are 3 or more
        if (matches.size >= 3) {
            this.bubbles = this.bubbles.filter(bubble => 
                !matches.has(`${bubble.row},${bubble.col}`)
            );
            
            // Update score
            this.score += matches.size * 100;
            
            // Check for floating bubbles
            this.removeFloatingBubbles();
        }
    }
    
    getNeighbors(bubble) {
        const neighbors = [];
        const directions = bubble.row % 2 ? 
            [[-1,0], [1,0], [0,-1], [0,1], [-1,1], [1,1]] : // odd row
            [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [1,-1]]; // even row
        
        for (const [dx, dy] of directions) {
            const neighbor = this.bubbles.find(b => 
                b.row === bubble.row + dy && 
                b.col === bubble.col + dx
            );
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
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
            
            // Check neighbors
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
        this.ctx.lineTo(
            this.shooterX + Math.sin(this.shooterAngle) * SHOOTER_HEIGHT,
            this.shooterY - Math.cos(this.shooterAngle) * SHOOTER_HEIGHT
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
            
            // Reset shooter state
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
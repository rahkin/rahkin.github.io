class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Game state
        this.snakes = [];
        this.pellets = [];
        this.player = null;
        this.camera = new Camera(this);
        this.lastUpdate = performance.now();
        this.running = false;
        this.score = 0;
        this.highScores = this.loadHighScores();
        
        // Input state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        
        // Bind event handlers
        this.handleResize = this.handleResize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Add event listeners
        window.addEventListener('resize', this.handleResize);
        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mouseup', this.handleMouseUp);
        canvas.addEventListener('touchstart', this.handleTouchStart);
        canvas.addEventListener('touchmove', this.handleTouchMove);
        canvas.addEventListener('touchend', this.handleTouchEnd);
        
        // Initial resize
        this.handleResize();
    }
    
    start(playerName) {
        // Reset game state
        this.snakes = [];
        this.pellets = [];
        this.score = 0;
        
        // Create player snake
        this.player = new Snake(this, {
            name: playerName,
            x: CONFIG.WORLD_WIDTH / 2,
            y: CONFIG.WORLD_HEIGHT / 2,
            color: Utils.randomColor()
        });
        this.snakes.push(this.player);
        
        // Set camera to follow player
        this.camera.setTarget(this.player);
        
        // Create initial bots
        for (let i = 0; i < CONFIG.INITIAL_BOT_COUNT; i++) {
            this.addBot();
        }
        
        // Create initial pellets
        for (let i = 0; i < CONFIG.INITIAL_PELLET_COUNT; i++) {
            this.addPellet();
        }
        
        // Start game loop
        this.running = true;
        this.lastUpdate = performance.now();
        requestAnimationFrame(() => this.update());
    }
    
    stop() {
        this.running = false;
        
        // Save high score if eligible
        if (this.score > 0) {
            this.addHighScore(this.player.name, this.score);
        }
        
        // Show game over screen
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('finalScore').textContent = this.score;
    }
    
    update() {
        if (!this.running) return;
        
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastUpdate) / 1000, 0.1); // Cap delta time at 100ms
        this.lastUpdate = now;
        
        // Update game objects
        this.updateSnakes(deltaTime);
        this.updatePellets(deltaTime);
        
        // Ensure camera is following player
        if (this.player && this.camera.followTarget !== this.player) {
            this.camera.setTarget(this.player);
        }
        
        // Update camera
        this.camera.update(deltaTime);
        
        // Maintain bot and pellet counts
        this.maintainBotCount();
        this.maintainPelletCount();
        
        // Update score
        if (this.player) {
            this.score = Math.floor(this.player.length - CONFIG.INITIAL_SNAKE_LENGTH);
            document.getElementById('score').textContent = this.score;
        }
        
        // Render frame
        this.render();
        
        // Schedule next update
        requestAnimationFrame(() => this.update());
    }
    
    updateSnakes(deltaTime) {
        for (const snake of this.snakes) {
            snake.update(deltaTime);
        }
    }
    
    updatePellets(deltaTime) {
        for (const pellet of this.pellets) {
            pellet.update(deltaTime);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        this.camera.applyTransform(this.ctx);
        
        // Draw grid
        this.drawGrid();
        
        // Draw game objects
        this.renderPellets();
        this.renderSnakes();
        
        // Reset transform for UI
        this.camera.resetTransform(this.ctx);
        
        // Draw minimap
        this.drawMinimap();
        
        // Draw debug info if enabled
        if (CONFIG.DEBUG) {
            this.ctx.save();
            this.ctx.font = '12px monospace';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 10, 20);
            this.ctx.fillText(`Snake: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 10, 40);
            this.ctx.restore();
        }
    }
    
    renderSnakes() {
        for (const snake of this.snakes) {
            snake.render(this.ctx, this.camera);
        }
    }
    
    renderPellets() {
        for (const pellet of this.pellets) {
            pellet.render(this.ctx, this.camera);
        }
    }
    
    drawGrid() {
        const gridSize = CONFIG.GRID_SIZE;
        const startX = Math.floor(this.camera.x - this.camera.width / 2);
        const startY = Math.floor(this.camera.y - this.camera.height / 2);
        const endX = Math.ceil(this.camera.x + this.camera.width / 2);
        const endY = Math.ceil(this.camera.y + this.camera.height / 2);
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.GRID_COLOR;
        this.ctx.lineWidth = 1 / (this.camera.zoom * CONFIG.PIXEL_RATIO);
        
        // Draw vertical lines
        for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        
        // Draw horizontal lines
        for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        
        this.ctx.stroke();
    }
    
    drawMinimap() {
        const margin = 10;
        const size = 150;
        const x = this.canvas.width - size - margin;
        const y = this.canvas.height - size - margin;
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, size, size);
        
        // Draw border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, size, size);
        
        // Draw game objects
        const scale = size / CONFIG.WORLD_WIDTH;
        
        // Draw pellets
        this.ctx.fillStyle = '#ffffff';
        for (const pellet of this.pellets) {
            this.ctx.fillRect(
                x + pellet.x * scale - 1,
                y + pellet.y * scale - 1,
                2, 2
            );
        }
        
        // Draw snakes
        for (const snake of this.snakes) {
            this.ctx.fillStyle = snake === this.player ? '#ffffff' : snake.color;
            this.ctx.fillRect(
                x + snake.x * scale - 2,
                y + snake.y * scale - 2,
                4, 4
            );
        }
        
        // Draw viewport
        const vpX = x + this.camera.x * scale - (this.camera.width * scale) / 2;
        const vpY = y + this.camera.y * scale - (this.camera.height * scale) / 2;
        const vpW = this.camera.width * scale;
        const vpH = this.camera.height * scale;
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(vpX, vpY, vpW, vpH);
    }
    
    addBot() {
        const bot = new Bot(this);
        this.snakes.push(bot);
        return bot;
    }
    
    addPellet(options = {}) {
        const pellet = new Pellet(this, options);
        this.pellets.push(pellet);
        return pellet;
    }
    
    removeSnake(snake) {
        const index = this.snakes.indexOf(snake);
        if (index !== -1) {
            this.snakes.splice(index, 1);
        }
        
        if (snake === this.player) {
            this.stop();
        }
    }
    
    removePellet(pellet) {
        const index = this.pellets.indexOf(pellet);
        if (index !== -1) {
            this.pellets.splice(index, 1);
        }
    }
    
    maintainBotCount() {
        while (this.snakes.length < CONFIG.MIN_BOT_COUNT + 1) {
            this.addBot();
        }
    }
    
    maintainPelletCount() {
        while (this.pellets.length < CONFIG.MIN_PELLET_COUNT) {
            this.addPellet();
        }
    }
    
    handleResize() {
        const pixelRatio = CONFIG.PIXEL_RATIO;
        
        // Get the container dimensions (either window or fullscreen)
        let width, height;
        if (document.fullscreenElement) {
            width = window.screen.width;
            height = window.screen.height;
        } else {
            width = window.innerWidth;
            height = window.innerHeight;
        }
        
        // Update canvas size
        this.canvas.width = width * pixelRatio;
        this.canvas.height = height * pixelRatio;
        
        // Update canvas style
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Force a camera update to adjust the view
        if (this.camera) {
            this.camera.updateViewport();
        }
    }
    
    handleMouseMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.updatePlayerAngle();
    }
    
    handleMouseDown() {
        this.mouseDown = true;
        if (this.player) {
            this.player.setBoost(true);
        }
    }
    
    handleMouseUp() {
        this.mouseDown = false;
        if (this.player) {
            this.player.setBoost(false);
        }
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
        this.mouseDown = true;
        this.updatePlayerAngle();
        if (this.player) {
            this.player.setBoost(true);
        }
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
        this.updatePlayerAngle();
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        this.mouseDown = false;
        if (this.player) {
            this.player.setBoost(false);
        }
    }
    
    updatePlayerAngle() {
        if (!this.player) return;
        
        const screenPos = this.camera.worldToScreen(this.player.x, this.player.y);
        const dx = this.mouseX * CONFIG.PIXEL_RATIO - screenPos.x;
        const dy = this.mouseY * CONFIG.PIXEL_RATIO - screenPos.y;
        this.player.setTargetAngle(Math.atan2(dy, dx));
    }
    
    loadHighScores() {
        const scores = localStorage.getItem('highScores');
        return scores ? JSON.parse(scores) : [];
    }
    
    addHighScore(name, score) {
        this.highScores.push({ name, score });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, CONFIG.MAX_HIGH_SCORES);
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
        
        // Update high scores display
        this.updateHighScoresDisplay();
    }
    
    updateHighScoresDisplay() {
        const container = document.getElementById('highScores');
        container.innerHTML = '';
        
        this.highScores.forEach((score, index) => {
            const row = document.createElement('div');
            row.className = 'high-score-row';
            row.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${score.name}</span>
                <span class="score">${score.score}</span>
            `;
            container.appendChild(row);
        });
    }
} 
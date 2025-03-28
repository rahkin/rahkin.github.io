class Pellet {
    constructor(game, options = {}) {
        this.game = game;
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = options.x || Utils.random(0, CONFIG.WORLD_WIDTH);
        this.y = options.y || Utils.random(0, CONFIG.WORLD_HEIGHT);
        this.color = options.color || Utils.randomColor();
        this.size = CONFIG.PELLET_SIZE;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = CONFIG.PELLET_PULSE_SPEED;
        this.pulseAmount = CONFIG.PELLET_PULSE_AMOUNT;
    }

    update(deltaTime) {
        // Update pulse animation
        this.pulsePhase += this.pulseSpeed * deltaTime;
        if (this.pulsePhase > Math.PI * 2) {
            this.pulsePhase -= Math.PI * 2;
        }

        // Check for snake collisions
        for (const snake of this.game.snakes) {
            if (Utils.circleCollision(
                this.x, this.y, this.size,
                snake.x, snake.y, CONFIG.HEAD_HITBOX_RADIUS
            )) {
                // Increase snake length
                snake.grow(CONFIG.PELLET_GROWTH_AMOUNT);
                
                // Remove pellet from game
                this.game.removePellet(this);
                return;
            }
        }
    }

    render(ctx, camera) {
        const screenPos = Utils.worldToScreen(this.x, this.y, camera);
        
        // Calculate pulse size
        const pulseSize = this.size * (1 + Math.sin(this.pulsePhase) * this.pulseAmount);
        
        ctx.save();
        
        // Draw glow effect
        if (CONFIG.PELLET_GLOW) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        
        // Draw pellet
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, pulseSize * camera.zoom, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.restore();
    }
} 
class Snake {
    constructor(game, options = {}) {
        this.game = game;
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.name = options.name || 'Anonymous Snake';
        this.color = options.color || Utils.randomColor();
        this.isBot = options.isBot || false;
        
        // Position and movement
        this.x = options.x || Utils.random(0, CONFIG.WORLD_WIDTH);
        this.y = options.y || Utils.random(0, CONFIG.WORLD_HEIGHT);
        this.angle = options.angle || Utils.random(0, Math.PI * 2);
        this.targetAngle = this.angle;
        this.speed = CONFIG.BASE_SPEED;
        this.boosting = false;
        
        // Snake body
        this.length = CONFIG.INITIAL_SNAKE_LENGTH;
        this.parts = [];
        this.initializeParts();
    }
    
    initializeParts() {
        // Initialize snake body parts
        this.parts = [];
        for (let i = 0; i < this.length; i++) {
            const distance = i * CONFIG.MIN_SNAKE_PARTS_SPACING;
            const angle = this.angle + Math.PI; // Opposite direction of head
            this.parts.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance
            });
        }
    }
    
    update(deltaTime) {
        // Update angle
        const angleDiff = Utils.clamp(
            ((((this.targetAngle - this.angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
            -CONFIG.TURNING_RADIUS,
            CONFIG.TURNING_RADIUS
        );
        this.angle += angleDiff * deltaTime;
        
        // Update speed when boosting
        if (this.boosting) {
            this.speed = CONFIG.BOOST_SPEED;
            this.length -= CONFIG.BOOST_LENGTH_LOSS_RATE * deltaTime;
            if (this.length < CONFIG.INITIAL_SNAKE_LENGTH) {
                this.boosting = false;
            }
        } else {
            this.speed = CONFIG.BASE_SPEED;
        }
        
        // Calculate movement
        const dx = Math.cos(this.angle) * this.speed;
        const dy = Math.sin(this.angle) * this.speed;

        // Update position
        this.x = (this.x + dx + CONFIG.WORLD_WIDTH) % CONFIG.WORLD_WIDTH;
        this.y = (this.y + dy + CONFIG.WORLD_HEIGHT) % CONFIG.WORLD_HEIGHT;
        
        // Update body parts
        this.updateParts();
        
        // Check collisions
        this.checkCollisions();
    }
    
    updateParts() {
        // Add new part at current position
        this.parts.unshift({ x: this.x, y: this.y });
        
        // Remove excess parts based on length
        while (this.parts.length > this.length / CONFIG.MIN_SNAKE_PARTS_SPACING) {
            this.parts.pop();
        }
    }
    
    checkCollisions() {
        // Check collision with other snakes
        for (const snake of this.game.snakes) {
            if (snake === this) continue;
            
            // Check collision with other snake's body parts
            for (let i = 0; i < snake.parts.length; i++) {
                const part = snake.parts[i];
                if (Utils.circleCollision(
                    this.x, this.y, CONFIG.HEAD_HITBOX_RADIUS,
                    part.x, part.y, CONFIG.BODY_HITBOX_RADIUS
                )) {
                    this.die();
                    return;
                }
            }
        }
    }
    
    die() {
        // Create pellets from snake body
        const pelletCount = Math.floor(this.length);
        for (let i = 0; i < pelletCount; i++) {
            const part = this.parts[Math.floor(i * this.parts.length / pelletCount)];
            this.game.addPellet({
                x: part.x + Utils.random(-10, 10),
                y: part.y + Utils.random(-10, 10),
                color: this.color
            });
        }
        
        // Remove snake from game
        this.game.removeSnake(this);
    }
    
    setBoost(boosting) {
        this.boosting = boosting;
    }
    
    setTargetAngle(angle) {
        this.targetAngle = angle;
    }
    
    grow(amount) {
        this.length += amount;
    }
    
    render(ctx, camera) {
        ctx.save();
        
        // Draw snake body
        ctx.beginPath();
        ctx.lineWidth = CONFIG.BODY_HITBOX_RADIUS * 2;
        ctx.strokeStyle = this.color;
        
        if (CONFIG.SNAKE_GLOW) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        
        let isFirstPart = true;
        for (const part of this.parts) {
            const screenPos = camera.worldToScreen(part.x, part.y);
            if (isFirstPart) {
                ctx.moveTo(screenPos.x, screenPos.y);
                isFirstPart = false;
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        ctx.stroke();
        
        // Draw snake head
        const headPos = camera.worldToScreen(this.x, this.y);
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, CONFIG.HEAD_HITBOX_RADIUS * camera.zoom, 0, Math.PI * 2);
        ctx.fillStyle = Utils.adjustColorBrightness(this.color, 1.2);
        ctx.fill();
        
        // Draw name with background for better visibility
        if (this === this.game.player) {
            ctx.font = '16px "Press Start 2P"';
            const nameWidth = ctx.measureText(this.name).width;
            
            // Draw name background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(
                headPos.x - nameWidth/2 - 5,
                headPos.y - 35,
                nameWidth + 10,
                25
            );
            
            // Draw name text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, headPos.x, headPos.y - 20);
            
            // Draw "YOU" indicator
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('YOU', headPos.x, headPos.y - 40);
        } else {
            // Draw other snakes' names smaller
            ctx.font = '12px "Press Start 2P"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, headPos.x, headPos.y - 20);
        }
        
        ctx.restore();
    }
} 
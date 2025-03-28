class Camera {
    constructor(game, options = {}) {
        this.game = game;
        this.x = options.x || CONFIG.WORLD_WIDTH / 2;
        this.y = options.y || CONFIG.WORLD_HEIGHT / 2;
        this.zoom = options.zoom || 0.7; // Set a fixed initial zoom that works well
        this.width = 0;
        this.height = 0;
        this.followTarget = null;
        this.updateViewport();
    }

    updateViewport() {
        // Calculate the visible area in world units
        this.width = this.game.canvas.width / (this.zoom * CONFIG.PIXEL_RATIO);
        this.height = this.game.canvas.height / (this.zoom * CONFIG.PIXEL_RATIO);
    }

    setTarget(target) {
        this.followTarget = target;
    }

    update(deltaTime) {
        if (this.followTarget) {
            // Simple smooth following
            const targetX = this.followTarget.x;
            const targetY = this.followTarget.y;

            // Move camera towards target with smoothing
            this.x += (targetX - this.x) * (1 - CONFIG.CAMERA_SMOOTHING);
            this.y += (targetY - this.y) * (1 - CONFIG.CAMERA_SMOOTHING);

            // Keep camera within world bounds
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            
            this.x = Math.max(halfWidth, Math.min(CONFIG.WORLD_WIDTH - halfWidth, this.x));
            this.y = Math.max(halfHeight, Math.min(CONFIG.WORLD_HEIGHT - halfHeight, this.y));
        }
    }

    applyTransform(ctx) {
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Get the screen center
        const screenCenterX = this.game.canvas.width / 2;
        const screenCenterY = this.game.canvas.height / 2;

        // Calculate the transform
        const scale = this.zoom * CONFIG.PIXEL_RATIO;
        
        // Center the view on the camera position
        const translateX = screenCenterX - this.x * scale;
        const translateY = screenCenterY - this.y * scale;

        // Apply the transform
        ctx.setTransform(
            scale, 0,
            0, scale,
            translateX,
            translateY
        );
    }

    resetTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom * CONFIG.PIXEL_RATIO + this.game.canvas.width / 2,
            y: (worldY - this.y) * this.zoom * CONFIG.PIXEL_RATIO + this.game.canvas.height / 2
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.game.canvas.width / 2) / (this.zoom * CONFIG.PIXEL_RATIO) + this.x,
            y: (screenY - this.game.canvas.height / 2) / (this.zoom * CONFIG.PIXEL_RATIO) + this.y
        };
    }

    isOnScreen(x, y, margin = 0) {
        const screenPos = this.worldToScreen(x, y);
        return screenPos.x >= -margin &&
               screenPos.x <= this.game.canvas.width + margin &&
               screenPos.y >= -margin &&
               screenPos.y <= this.game.canvas.height + margin;
    }
} 
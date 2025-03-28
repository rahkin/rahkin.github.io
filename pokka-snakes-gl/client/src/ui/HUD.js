import * as THREE from 'three';

export class HUD {
    constructor(game) {
        this.game = game;
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.activePowerUps = new Set();
        
        this.setupHUD();
    }

    setupHUD() {
        // Create canvas for HUD
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.style.position = 'fixed';
        this.hudCanvas.style.top = '0';
        this.hudCanvas.style.left = '0';
        this.hudCanvas.style.width = '100%';
        this.hudCanvas.style.height = '100%';
        this.hudCanvas.style.pointerEvents = 'none';
        document.body.appendChild(this.hudCanvas);

        this.ctx = this.hudCanvas.getContext('2d');
        this.resize();
        
        // Bind the resize method to this instance
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
    }

    resize() {
        this.hudCanvas.width = window.innerWidth;
        this.hudCanvas.height = window.innerHeight;
    }

    updateScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
    }

    addPowerUp(powerUpType) {
        this.activePowerUps.add(powerUpType);
    }

    removePowerUp(powerUpType) {
        this.activePowerUps.delete(powerUpType);
    }

    render() {
        this.ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        
        // Set text style
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'left';

        // Draw score
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        this.ctx.fillText(`High Score: ${this.highScore}`, 20, 70);

        // Draw active power-ups
        let powerUpY = 100;
        this.ctx.font = '18px Arial';
        this.activePowerUps.forEach(powerUp => {
            this.ctx.fillText(`Active: ${powerUp}`, 20, powerUpY);
            powerUpY += 30;
        });
    }

    cleanup() {
        if (this.hudCanvas && this.hudCanvas.parentNode) {
            this.hudCanvas.parentNode.removeChild(this.hudCanvas);
        }
        window.removeEventListener('resize', this.resize);
    }
}
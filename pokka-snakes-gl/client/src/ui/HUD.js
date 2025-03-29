import * as THREE from 'three';

export class HUD {
    constructor(game) {
        this.game = game;
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.activePowerUps = new Map();
        
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
        const powerUp = this.game.gameManager.powerUps.get(powerUpType);
        if (powerUp) {
            this.activePowerUps.set(powerUpType, Date.now() + powerUp.duration);
        }
    }

    updatePowerUpDuration(powerUpType, duration) {
        if (this.activePowerUps.has(powerUpType)) {
            this.activePowerUps.set(powerUpType, Date.now() + duration);
        }
    }

    removePowerUp(powerUpType) {
        this.activePowerUps.delete(powerUpType);
    }

    getPowerUpColor(type) {
        const colors = {
            'Speed Boost': '#3EE0B1', // Mint
            'Ghost Mode': '#E179DA',  // Pink
            'Size Multiplier': '#FAA70D', // Orange
            'Invincibility': '#3EE0B1', // Mint
            'Point Multiplier': '#E179DA', // Pink
            'Time Slow': '#FAA70D', // Orange
            'Rainbow Trail': '#E179DA', // Pink
            'Magnet': '#3EE0B1' // Mint
        };
        return colors[type] || '#FFFFFF';
    }

    render() {
        this.ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        
        // Set text style for scores
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px "One Little Font", Arial';
        this.ctx.textAlign = 'left';

        // Draw score
        this.ctx.fillStyle = '#3EE0B1'; // Mint color for score
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        this.ctx.fillStyle = '#FAA70D'; // Orange color for high score
        this.ctx.fillText(`High Score: ${this.highScore}`, 20, 70);

        // Draw active power-ups
        let powerUpY = 100;
        this.ctx.font = '18px "Canva Sans", Arial';
        
        this.activePowerUps.forEach((endTime, powerUp) => {
            const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            const color = this.getPowerUpColor(powerUp);
            
            // Draw power-up icon
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(30, powerUpY + 8, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw power-up name and time left
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(`${powerUp} (${timeLeft}s)`, 50, powerUpY + 12);
            
            // Draw duration bar
            const barWidth = 100;
            const barHeight = 4;
            const duration = this.game.gameManager.powerUps.get(powerUp).duration;
            const progress = Math.max(0, Math.min(1, timeLeft / (duration / 1000)));
            
            this.ctx.fillStyle = '#333333';
            this.ctx.fillRect(50, powerUpY + 16, barWidth, barHeight);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(50, powerUpY + 16, barWidth * progress, barHeight);
            
            powerUpY += 30;
        });
    }

    cleanup() {
        if (this.hudCanvas && this.hudCanvas.parentNode) {
            this.hudCanvas.parentNode.removeChild(this.hudCanvas);
        }
        window.removeEventListener('resize', this.resize);
    }

    showGameOver() {
        console.log('HUD: Showing game over screen');
        
        // Remove any existing game over overlay first
        this.reset();
        
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            pointer-events: auto;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            padding: 30px;
            border-radius: 15px;
            color: white;
            text-align: center;
            font-family: 'One Little Font', Arial, sans-serif;
            pointer-events: auto;
        `;

        const heading = document.createElement('h1');
        heading.textContent = 'Game Over';
        heading.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 36px;
            font-family: 'One Little Font', Arial, sans-serif;
            color: #E179DA;
        `;

        const scoreText = document.createElement('p');
        scoreText.textContent = `Score: ${this.score}`;
        scoreText.style.cssText = `
            font-size: 24px;
            margin: 10px 0;
            font-family: 'Canva Sans', Arial, sans-serif;
            color: #3EE0B1;
        `;

        const highScoreText = document.createElement('p');
        highScoreText.textContent = `High Score: ${this.highScore}`;
        highScoreText.style.cssText = `
            font-size: 24px;
            margin: 10px 0;
            font-family: 'Canva Sans', Arial, sans-serif;
            color: #FAA70D;
        `;

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Play Again';
        restartButton.style.cssText = `
            background: #3EE0B1;
            color: black;
            border: none;
            padding: 10px 20px;
            font-size: 18px;
            font-family: 'Canva Sans', Arial, sans-serif;
            border-radius: 25px;
            cursor: pointer;
            margin-top: 20px;
            pointer-events: auto;
            transition: background-color 0.3s;
        `;
        
        restartButton.onmouseover = () => {
            restartButton.style.background = '#FAA70D';
        };
        
        restartButton.onmouseout = () => {
            restartButton.style.background = '#3EE0B1';
        };

        // Add elements to content
        content.appendChild(heading);
        content.appendChild(scoreText);
        content.appendChild(highScoreText);
        content.appendChild(restartButton);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // Add click event listener to the restart button
        restartButton.addEventListener('click', () => {
            console.log('HUD: Play Again clicked');
            
            // Remove the overlay first
            overlay.remove();
            
            // Reset the game state
            if (this.game) {
                this.game.restart();
            }
        });
        
        console.log('HUD: Game over screen shown');
    }

    reset() {
        console.log('HUD: Resetting');
        
        this.score = 0;
        this.activePowerUps.clear();
        
        // Remove game over overlay if it exists
        const overlay = document.querySelector('.game-over-overlay');
        if (overlay) {
            overlay.remove();
            console.log('HUD: Removed game over overlay');
        }
        
        // Reset the HUD canvas to be non-interactive
        if (this.hudCanvas) {
            this.hudCanvas.style.pointerEvents = 'none';
        }
        
        // Clear the canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        }
        
        console.log('HUD: Reset complete');
    }
}
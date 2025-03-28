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
            font-family: Arial, sans-serif;
            pointer-events: auto;
        `;

        const heading = document.createElement('h1');
        heading.textContent = 'Game Over';
        heading.style.cssText = 'margin: 0 0 20px 0; font-size: 36px;';

        const scoreText = document.createElement('p');
        scoreText.textContent = `Score: ${this.score}`;
        scoreText.style.cssText = 'font-size: 24px; margin: 10px 0;';

        const highScoreText = document.createElement('p');
        highScoreText.textContent = `High Score: ${this.highScore}`;
        highScoreText.style.cssText = 'font-size: 24px; margin: 10px 0;';

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Play Again';
        restartButton.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 18px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
            pointer-events: auto;
            transition: background-color 0.3s;
        `;
        
        restartButton.onmouseover = () => {
            restartButton.style.background = '#45a049';
        };
        
        restartButton.onmouseout = () => {
            restartButton.style.background = '#4CAF50';
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
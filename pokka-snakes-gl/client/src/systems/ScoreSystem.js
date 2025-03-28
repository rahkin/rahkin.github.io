export class ScoreSystem {
    constructor(game) {
        this.game = game;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.multiplier = 1;
        this.combo = 0;
        this.lastScoreTime = 0;
        this.comboTimeout = 2000; // 2 seconds
        
        this.setupScoreDisplay();
    }

    setupScoreDisplay() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(this.scoreElement);
        this.updateScoreDisplay();
    }

    addScore(points) {
        const now = Date.now();
        
        // Update combo
        if (now - this.lastScoreTime < this.comboTimeout) {
            this.combo++;
            this.multiplier = 1 + (this.combo * 0.1);
        } else {
            this.combo = 0;
            this.multiplier = 1;
        }
        
        this.lastScoreTime = now;
        
        // Calculate final points with multiplier
        const finalPoints = Math.round(points * this.multiplier);
        this.score += finalPoints;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        this.updateScoreDisplay();
        this.showScorePopup(finalPoints);
    }

    showScorePopup(points) {
        const popup = document.createElement('div');
        popup.textContent = `+${points}`;
        popup.style.cssText = `
            position: fixed;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            pointer-events: none;
            transition: all 0.5s ease-out;
        `;
        
        // Position popup near the snake's head
        const headPosition = this.game.snake.head.position.clone();
        headPosition.project(this.game.camera);
        popup.style.left = `${(headPosition.x + 1) * window.innerWidth / 2}px`;
        popup.style.top = `${(-headPosition.y + 1) * window.innerHeight / 2}px`;
        
        document.body.appendChild(popup);
        
        // Animate and remove
        requestAnimationFrame(() => {
            popup.style.transform = 'translateY(-50px)';
            popup.style.opacity = '0';
        });
        
        setTimeout(() => popup.remove(), 500);
    }

    updateScoreDisplay() {
        this.scoreElement.innerHTML = `
            Score: ${this.score}<br>
            High Score: ${this.highScore}<br>
            ${this.multiplier > 1 ? `Multiplier: x${this.multiplier.toFixed(1)}` : ''}
        `;
    }

    loadHighScore() {
        return parseInt(localStorage.getItem('highScore')) || 0;
    }

    saveHighScore() {
        localStorage.setItem('highScore', this.highScore.toString());
    }

    reset() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.updateScoreDisplay();
    }

    cleanup() {
        if (this.scoreElement) {
            this.scoreElement.remove();
        }
    }
} 
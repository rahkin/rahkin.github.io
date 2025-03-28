export class AnimatedUI {
    constructor() {
        this.createHUD();
        this.createScorePopup();
        this.createPowerUpIndicator();
        this.createComboSystem();
    }

    createHUD() {
        this.hud = document.createElement('div');
        this.hud.className = 'game-hud';
        this.hud.innerHTML = `
            <div class="score-container">
                <div class="score">Score: <span id="scoreValue">0</span></div>
                <div class="multiplier">×<span id="multiplierValue">1</span></div>
            </div>
            <div class="power-up-container"></div>
            <div class="combo-meter">
                <div class="combo-bar"></div>
                <div class="combo-text">Combo: <span id="comboValue">0</span>×</div>
            </div>
        `;
        document.body.appendChild(this.hud);
    }

    createScorePopup() {
        this.scorePopupContainer = document.createElement('div');
        this.scorePopupContainer.className = 'score-popup-container';
        document.body.appendChild(this.scorePopupContainer);
    }

    showScorePopup(score, position, isCombo = false) {
        const popup = document.createElement('div');
        popup.className = `score-popup ${isCombo ? 'combo' : ''}`;
        popup.textContent = `+${score}`;
        
        // Convert 3D position to screen coordinates
        const screenPosition = this.worldToScreen(position);
        popup.style.left = `${screenPosition.x}px`;
        popup.style.top = `${screenPosition.y}px`;
        
        this.scorePopupContainer.appendChild(popup);
        
        // Animate and remove
        setTimeout(() => {
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 1000);
        }, 1000);
    }

    createPowerUpIndicator() {
        this.powerUpContainer = this.hud.querySelector('.power-up-container');
    }

    showPowerUp(type, duration) {
        const indicator = document.createElement('div');
        indicator.className = 'power-up-indicator';
        indicator.innerHTML = `
            <div class="power-up-icon ${type.toLowerCase()}"></div>
            <div class="power-up-timer">
                <div class="timer-bar"></div>
            </div>
            <div class="power-up-name">${type}</div>
        `;
        
        this.powerUpContainer.appendChild(indicator);
        
        // Animate timer bar
        const timerBar = indicator.querySelector('.timer-bar');
        timerBar.style.animation = `timer ${duration/1000}s linear`;
        
        // Remove after duration
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 500);
        }, duration);
    }

    createComboSystem() {
        this.comboValue = 0;
        this.comboTimer = null;
        this.comboBar = this.hud.querySelector('.combo-bar');
        this.comboText = this.hud.querySelector('#comboValue');
    }

    updateCombo() {
        clearTimeout(this.comboTimer);
        this.comboValue++;
        this.comboText.textContent = this.comboValue;
        this.comboBar.style.width = '100%';
        
        // Animate combo bar
        this.comboBar.style.transition = 'width 3s linear';
        this.comboBar.style.width = '0%';
        
        // Reset combo after 3 seconds
        this.comboTimer = setTimeout(() => {
            this.resetCombo();
        }, 3000);
    }

    resetCombo() {
        this.comboValue = 0;
        this.comboText.textContent = '0';
        this.comboBar.style.transition = 'none';
        this.comboBar.style.width = '0%';
    }

    updateScore(score, multiplier = 1) {
        const scoreElement = document.getElementById('scoreValue');
        const multiplierElement = document.getElementById('multiplierValue');
        
        // Animate score change
        this.animateNumber(scoreElement, parseInt(scoreElement.textContent), score, 500);
        multiplierElement.textContent = multiplier;
        
        if (multiplier > 1) {
            multiplierElement.classList.add('active');
        } else {
            multiplierElement.classList.remove('active');
        }
    }

    animateNumber(element, start, end, duration) {
        const range = end - start;
        const minStep = 1;
        const steps = Math.max(Math.floor(duration / 16), 1);
        const increment = Math.max(Math.floor(range / steps), minStep);
        
        let current = start;
        const animate = () => {
            current = Math.min(current + increment, end);
            element.textContent = current;
            
            if (current < end) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    worldToScreen(position) {
        // Convert 3D world position to screen coordinates
        // This needs to be implemented based on your camera setup
        // Return { x: screenX, y: screenY }
        return {
            x: (position.x + 1) * window.innerWidth / 2,
            y: (-position.y + 1) * window.innerHeight / 2
        };
    }

    showGameOver(finalScore) {
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over-screen';
        gameOver.innerHTML = `
            <div class="game-over-content">
                <h1>Game Over</h1>
                <div class="final-score">Score: ${finalScore}</div>
                <div class="buttons">
                    <button id="restartButton">Play Again</button>
                    <button id="menuButton">Main Menu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(gameOver);
        
        // Animate entrance
        setTimeout(() => gameOver.classList.add('active'), 100);
        
        // Setup button listeners
        gameOver.querySelector('#restartButton').onclick = () => {
            gameOver.classList.remove('active');
            setTimeout(() => {
                gameOver.remove();
                // Trigger restart callback
                if (this.onRestart) this.onRestart();
            }, 500);
        };
        
        gameOver.querySelector('#menuButton').onclick = () => {
            gameOver.classList.remove('active');
            setTimeout(() => {
                gameOver.remove();
                // Trigger menu callback
                if (this.onMenu) this.onMenu();
            }, 500);
        };
    }
} 
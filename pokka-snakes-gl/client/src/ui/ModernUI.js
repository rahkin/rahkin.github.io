export class ModernUI {
    constructor(game) {
        this.game = game;
        this.elements = new Map();
        this.createUI();
    }

    createUI() {
        this.createHUD();
        this.createMainMenu();
        this.createPauseMenu();
        this.createGameOver();
        this.createSettings();
        this.createPowerUpIndicators();
    }

    createHUD() {
        const hud = document.createElement('div');
        hud.className = 'game-hud';
        hud.innerHTML = `
            <div class="score-container">
                <div class="score">
                    <span class="score-label">Score</span>
                    <span class="score-value" id="scoreValue">0</span>
                </div>
                <div class="multiplier" id="scoreMultiplier">
                    <span class="multiplier-value">×1</span>
                </div>
            </div>
            <div class="power-up-container" id="powerUpContainer"></div>
            <div class="combo-meter">
                <div class="combo-bar" id="comboBar"></div>
                <span class="combo-text">Combo ×<span id="comboValue">1</span></span>
            </div>
        `;
        document.body.appendChild(hud);
        this.elements.set('hud', hud);
    }

    createMainMenu() {
        const menu = document.createElement('div');
        menu.className = 'menu main-menu';
        menu.innerHTML = `
            <div class="menu-content">
                <h1 class="game-title">Snake GL</h1>
                <div class="menu-buttons">
                    <button class="menu-button" id="playButton">Play</button>
                    <button class="menu-button" id="settingsButton">Settings</button>
                    <button class="menu-button" id="achievementsButton">Achievements</button>
                </div>
                <div class="difficulty-select">
                    <label>Difficulty</label>
                    <div class="difficulty-buttons">
                        <button class="difficulty-button" data-difficulty="easy">Easy</button>
                        <button class="difficulty-button active" data-difficulty="medium">Medium</button>
                        <button class="difficulty-button" data-difficulty="hard">Hard</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(menu);
        this.elements.set('mainMenu', menu);
        this.setupMenuHandlers(menu);
    }

    createPowerUpIndicators() {
        const container = document.getElementById('powerUpContainer');
        
        PowerUpSystem.Types.forEach(type => {
            const indicator = document.createElement('div');
            indicator.className = 'power-up-indicator';
            indicator.dataset.type = type.id;
            indicator.innerHTML = `
                <div class="power-up-icon">${type.icon}</div>
                <div class="power-up-timer">
                    <div class="timer-bar"></div>
                </div>
            `;
            indicator.style.display = 'none';
            container.appendChild(indicator);
        });
    }

    showPowerUpIndicator(type, duration) {
        const indicator = document.querySelector(`.power-up-indicator[data-type="${type.id}"]`);
        if (indicator) {
            indicator.style.display = 'flex';
            const timerBar = indicator.querySelector('.timer-bar');
            timerBar.style.animation = `timer ${duration/1000}s linear`;
            
            setTimeout(() => {
                indicator.style.display = 'none';
            }, duration);
        }
    }

    updateScore(score, multiplier = 1) {
        const scoreElement = document.getElementById('scoreValue');
        const multiplierElement = document.getElementById('scoreMultiplier');
        
        this.animateNumber(scoreElement, parseInt(scoreElement.textContent), score);
        multiplierElement.textContent = `×${multiplier}`;
        
        if (multiplier > 1) {
            multiplierElement.classList.add('active');
        } else {
            multiplierElement.classList.remove('active');
        }
    }

    animateNumber(element, start, end) {
        const duration = 500;
        const steps = 20;
        const step = (end - start) / steps;
        let current = start;
        
        const animate = () => {
            current += step;
            if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
                element.textContent = end;
                return;
            }
            element.textContent = Math.round(current);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    showCombo(value) {
        const comboElement = document.getElementById('comboValue');
        const comboBar = document.getElementById('comboBar');
        
        comboElement.textContent = value;
        comboBar.style.width = '100%';
        
        // Animate combo bar
        comboBar.style.transition = 'width 3s linear';
        setTimeout(() => {
            comboBar.style.width = '0%';
        }, 50);
    }

    setupMenuHandlers(menu) {
        // Menu button handlers
        menu.querySelector('#playButton').addEventListener('click', () => {
            this.hideMenu();
            this.game.start();
        });

        // Difficulty selection
        const difficultyButtons = menu.querySelectorAll('.difficulty-button');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                difficultyButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.game.setDifficulty(button.dataset.difficulty);
            });
        });
    }

    showMenu() {
        this.elements.get('mainMenu').classList.add('active');
    }

    hideMenu() {
        this.elements.get('mainMenu').classList.remove('active');
    }
} 
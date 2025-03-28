export class GameUI {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.createMainMenu();
        this.createHUD();
        this.createGameOverScreen();
        this.createSettingsMenu();
        this.highScores = this.loadHighScores();
        this.setupEventListeners();
    }

    createMainMenu() {
        this.mainMenu = document.createElement('div');
        this.mainMenu.className = 'menu main-menu';
        this.mainMenu.innerHTML = `
            <div class="menu-content">
                <h1>Pokka's Snakes</h1>
                <div class="difficulty-select">
                    <h3>Select Difficulty:</h3>
                    <select id="difficultySelect">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div class="menu-buttons">
                    <button id="startGame">Play Game</button>
                    <button id="viewHighScores">High Scores</button>
                    <button id="openSettings">Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.mainMenu);
    }

    createHUD() {
        this.hud = document.createElement('div');
        this.hud.className = 'hud';
        this.hud.innerHTML = `
            <div class="score">Score: <span id="scoreValue">0</span></div>
            <div class="high-score">Best: <span id="highScoreValue">0</span></div>
            <div class="controls">
                <button id="pauseButton">⏸️</button>
                <button id="fullscreenButton">⛶</button>
            </div>
            <div class="mobile-controls">
                <button id="upButton">↑</button>
                <button id="leftButton">←</button>
                <button id="rightButton">→</button>
                <button id="downButton">↓</button>
            </div>
        `;
        document.body.appendChild(this.hud);
        this.hud.style.display = 'none';
    }

    createGameOverScreen() {
        this.gameOverScreen = document.createElement('div');
        this.gameOverScreen.className = 'menu game-over';
        this.gameOverScreen.innerHTML = `
            <div class="menu-content">
                <h2>Game Over!</h2>
                <div class="final-score">Score: <span id="finalScore">0</span></div>
                <div class="high-score">Best: <span id="finalHighScore">0</span></div>
                <button id="restartGame">Play Again</button>
                <button id="returnToMenu">Main Menu</button>
            </div>
        `;
        document.body.appendChild(this.gameOverScreen);
        this.gameOverScreen.style.display = 'none';
    }

    createSettingsMenu() {
        this.settingsMenu = document.createElement('div');
        this.settingsMenu.className = 'menu settings-menu';
        this.settingsMenu.innerHTML = `
            <div class="menu-content">
                <h2>Settings</h2>
                <div class="setting">
                    <label>Sound Effects</label>
                    <input type="range" id="soundVolume" min="0" max="100" value="50">
                </div>
                <div class="setting">
                    <label>Music</label>
                    <input type="range" id="musicVolume" min="0" max="100" value="50">
                </div>
                <div class="setting">
                    <label>Visual Effects</label>
                    <input type="checkbox" id="visualEffects" checked>
                </div>
                <button id="closeSettings">Close</button>
            </div>
        `;
        document.body.appendChild(this.settingsMenu);
        this.settingsMenu.style.display = 'none';
    }

    loadHighScores() {
        const scores = localStorage.getItem('snakeHighScores');
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScore(score) {
        this.highScores.push(score);
        this.highScores.sort((a, b) => b - a);
        this.highScores = this.highScores.slice(0, 10); // Keep top 10
        localStorage.setItem('snakeHighScores', JSON.stringify(this.highScores));
    }

    updateScore(score) {
        document.getElementById('scoreValue').textContent = score;
        document.getElementById('highScoreValue').textContent = 
            Math.max(...this.highScores, score);
    }

    showMainMenu() {
        this.mainMenu.style.display = 'flex';
        this.hud.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        this.settingsMenu.style.display = 'none';
    }

    showGame() {
        this.mainMenu.style.display = 'none';
        this.hud.style.display = 'flex';
        this.gameOverScreen.style.display = 'none';
        this.settingsMenu.style.display = 'none';
    }

    showGameOver(score) {
        this.gameOverScreen.style.display = 'flex';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalHighScore').textContent = 
            Math.max(...this.highScores);
    }

    showSettings() {
        this.settingsMenu.style.display = 'flex';
    }

    setupEventListeners() {
        // Start Game button
        const startButton = this.mainMenu.querySelector('#startGame');
        startButton.addEventListener('click', () => {
            const difficulty = this.mainMenu.querySelector('#difficultySelect').value;
            this.callbacks.onGameStart(difficulty);
        });

        // High Scores button
        const highScoresButton = this.mainMenu.querySelector('#viewHighScores');
        highScoresButton.addEventListener('click', () => {
            if (this.callbacks.onViewHighScores) {
                this.callbacks.onViewHighScores();
            }
        });

        // Settings button
        const settingsButton = this.mainMenu.querySelector('#openSettings');
        settingsButton.addEventListener('click', () => {
            if (this.callbacks.onOpenSettings) {
                this.callbacks.onOpenSettings();
            }
        });

        // Game Over screen buttons
        const restartButton = this.gameOverScreen.querySelector('#restartGame');
        restartButton.addEventListener('click', () => {
            const difficulty = this.mainMenu.querySelector('#difficultySelect').value;
            this.callbacks.onGameStart(difficulty);
        });

        const menuButton = this.gameOverScreen.querySelector('#returnToMenu');
        menuButton.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Difficulty selector
        const difficultySelect = this.mainMenu.querySelector('#difficultySelect');
        difficultySelect.addEventListener('change', (e) => {
            if (this.callbacks.onDifficultyChange) {
                this.callbacks.onDifficultyChange(e.target.value);
            }
        });
    }
} 
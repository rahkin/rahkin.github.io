export class GameStateManager {
    constructor(game) {
        this.game = game;
        this.currentState = 'MENU';
        this.states = new Map();
        this.listeners = new Set();
        this.stateData = new Map();
        
        this.setupStates();
        this.setupPersistence();
    }

    setupStates() {
        // Menu State
        this.registerState('MENU', {
            enter: () => {
                this.game.ui.showMenu();
                this.game.audio.playMusic('menu');
            },
            exit: () => {
                this.game.ui.hideMenu();
            },
            update: (deltaTime) => {
                // Update menu animations
            }
        });

        // Playing State
        this.registerState('PLAYING', {
            enter: () => {
                this.game.ui.showHUD();
                this.game.audio.playMusic('game');
                this.game.snake.reset();
                this.game.powerUpSystem.reset();
                this.startGame();
            },
            exit: () => {
                this.saveGameState();
            },
            update: (deltaTime) => {
                this.game.update(deltaTime);
                this.checkGameOver();
            }
        });

        // Paused State
        this.registerState('PAUSED', {
            enter: () => {
                this.game.ui.showPauseMenu();
                this.game.audio.pauseMusic();
            },
            exit: () => {
                this.game.ui.hidePauseMenu();
                this.game.audio.resumeMusic();
            },
            update: () => {
                // Update pause menu animations
            }
        });

        // Game Over State
        this.registerState('GAME_OVER', {
            enter: () => {
                this.game.ui.showGameOver();
                this.game.audio.playSound('gameOver');
                this.saveHighScore();
            },
            exit: () => {
                this.game.ui.hideGameOver();
            },
            update: () => {
                // Update game over animations
            }
        });
    }

    registerState(name, handlers) {
        this.states.set(name, handlers);
    }

    setState(newState, data = {}) {
        const oldState = this.states.get(this.currentState);
        const newStateHandlers = this.states.get(newState);

        if (!newStateHandlers) return;

        // Exit old state
        if (oldState && oldState.exit) {
            oldState.exit();
        }

        // Set new state
        this.currentState = newState;
        this.stateData.set(newState, data);

        // Enter new state
        if (newStateHandlers.enter) {
            newStateHandlers.enter(data);
        }

        // Notify listeners
        this.notifyListeners(newState, data);
    }

    update(deltaTime) {
        const currentStateHandlers = this.states.get(this.currentState);
        if (currentStateHandlers && currentStateHandlers.update) {
            currentStateHandlers.update(deltaTime);
        }
    }

    setupPersistence() {
        this.storage = window.localStorage;
        this.loadGameState();
    }

    saveGameState() {
        const gameState = {
            score: this.game.score,
            level: this.game.level,
            powerUps: Array.from(this.game.powerUpSystem.activePowerUps),
            snakePosition: this.game.snake.position.toArray(),
            timestamp: Date.now()
        };

        this.storage.setItem('gameState', JSON.stringify(gameState));
    }

    loadGameState() {
        const savedState = this.storage.getItem('gameState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                // Check if save is recent (within last 24 hours)
                if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                    this.stateData.set('PLAYING', state);
                    return true;
                }
            } catch (e) {
                console.error('Error loading game state:', e);
            }
        }
        return false;
    }

    saveHighScore() {
        const currentScore = this.game.score;
        const highScores = this.loadHighScores();
        
        highScores.push({
            score: currentScore,
            date: Date.now(),
            name: this.game.playerName || 'Anonymous'
        });

        // Sort and keep top 10
        highScores.sort((a, b) => b.score - a.score);
        highScores.splice(10);

        this.storage.setItem('highScores', JSON.stringify(highScores));
    }

    loadHighScores() {
        const saved = this.storage.getItem('highScores');
        return saved ? JSON.parse(saved) : [];
    }

    addListener(listener) {
        this.listeners.add(listener);
    }

    removeListener(listener) {
        this.listeners.delete(listener);
    }

    notifyListeners(state, data) {
        this.listeners.forEach(listener => {
            listener(state, data);
        });
    }

    cleanup() {
        this.saveGameState();
        this.listeners.clear();
    }
} 
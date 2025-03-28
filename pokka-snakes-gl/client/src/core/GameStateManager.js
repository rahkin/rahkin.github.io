export class GameStateManager {
    constructor(game) {
        this.game = game;
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.stateHistory = [];
        this.transitions = new Map();
        this.middleware = new Map();

        this.setupBaseStates();
        this.setupTransitions();
    }

    setupBaseStates() {
        // Loading State
        this.addState('loading', {
            enter: () => {
                this.game.ui.show('loadingScreen');
                this.game.resourceManager.loadResources();
            },
            update: () => {
                const progress = this.game.resourceManager.getLoadingProgress();
                if (progress >= 1) {
                    this.changeState('menu');
                }
            },
            exit: () => {
                this.game.ui.hide('loadingScreen');
            }
        });

        // Menu State
        this.addState('menu', {
            enter: () => {
                this.game.ui.show('mainMenu');
                this.game.audio.playMusic('menuTheme');
            },
            exit: () => {
                this.game.ui.hide('mainMenu');
            }
        });

        // Playing State
        this.addState('playing', {
            enter: () => {
                this.game.ui.show('hud');
                this.game.audio.playMusic('gameTheme');
                this.game.physics.start();
            },
            update: (deltaTime) => {
                this.game.updateGameLogic(deltaTime);
            },
            exit: () => {
                this.game.ui.hide('hud');
                this.game.physics.stop();
            }
        });

        // Paused State
        this.addState('paused', {
            enter: () => {
                this.game.ui.show('pauseMenu');
                this.game.audio.pauseMusic();
                this.game.time.pause();
            },
            exit: () => {
                this.game.ui.hide('pauseMenu');
                this.game.audio.resumeMusic();
                this.game.time.resume();
            }
        });

        // Game Over State
        this.addState('gameOver', {
            enter: () => {
                this.game.ui.show('gameOverScreen');
                this.game.audio.playSound('gameOver');
                this.game.saveHighScore();
            },
            exit: () => {
                this.game.ui.hide('gameOverScreen');
            }
        });
    }

    setupTransitions() {
        // Define state transitions
        this.addTransition('menu', 'playing', {
            validate: () => this.game.isResourcesLoaded(),
            before: () => this.game.reset(),
            after: () => this.game.start()
        });

        this.addTransition('playing', 'paused', {
            before: () => this.game.saveGameState()
        });

        this.addTransition('paused', 'playing', {
            before: () => this.game.prepareResume()
        });

        this.addTransition('playing', 'gameOver', {
            before: () => this.game.finalizeScore()
        });
    }

    addState(name, config) {
        this.states.set(name, {
            name,
            enter: config.enter || (() => {}),
            update: config.update || (() => {}),
            exit: config.exit || (() => {}),
            data: config.data || {}
        });
    }

    addTransition(from, to, handlers) {
        const key = `${from}->${to}`;
        this.transitions.set(key, {
            validate: handlers.validate || (() => true),
            before: handlers.before || (() => {}),
            after: handlers.after || (() => {})
        });
    }

    addMiddleware(name, handler) {
        this.middleware.set(name, handler);
    }

    async changeState(newStateName, data = {}) {
        const newState = this.states.get(newStateName);
        if (!newState) {
            console.error(`State '${newStateName}' does not exist`);
            return false;
        }

        // Check if transition is allowed
        if (this.currentState) {
            const transition = this.transitions.get(
                `${this.currentState.name}->${newStateName}`
            );

            if (transition) {
                if (!transition.validate()) {
                    console.warn(`Transition to '${newStateName}' failed validation`);
                    return false;
                }
                await transition.before();
            }
        }

        // Run middleware
        for (const [name, handler] of this.middleware) {
            const result = await handler(this.currentState, newState, data);
            if (!result) {
                console.warn(`Middleware '${name}' prevented state change`);
                return false;
            }
        }

        // Exit current state
        if (this.currentState) {
            await this.currentState.exit();
            this.previousState = this.currentState;
        }

        // Update state history
        this.stateHistory.push({
            from: this.currentState?.name,
            to: newStateName,
            timestamp: Date.now(),
            data
        });

        // Enter new state
        this.currentState = newState;
        await this.currentState.enter(data);

        // Run transition after handler
        const transition = this.transitions.get(
            `${this.previousState?.name}->${newStateName}`
        );
        if (transition) {
            await transition.after();
        }

        // Emit state change event
        this.game.eventSystem.emit('stateChange', {
            from: this.previousState?.name,
            to: newStateName,
            data
        });

        return true;
    }

    update(deltaTime) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }

    getCurrentState() {
        return this.currentState?.name;
    }

    getPreviousState() {
        return this.previousState?.name;
    }

    getStateHistory() {
        return this.stateHistory;
    }

    canTransitionTo(stateName) {
        if (!this.currentState) return true;
        
        const transition = this.transitions.get(
            `${this.currentState.name}->${stateName}`
        );
        return transition ? transition.validate() : false;
    }

    reset() {
        this.currentState = null;
        this.previousState = null;
        this.stateHistory = [];
    }
} 
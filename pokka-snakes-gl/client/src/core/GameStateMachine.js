export class GameStateMachine {
    constructor(game) {
        this.game = game;
        this.currentState = null;
        this.states = {
            LOADING: {
                enter: () => this.game.loadingScreen.show(),
                exit: () => this.game.loadingScreen.hide(),
                update: () => {}
            },
            MENU: {
                enter: () => {
                    this.game.ui.showMenu();
                    this.game.sound.playMusic('menu');
                },
                exit: () => {
                    this.game.ui.hideMenu();
                    this.game.sound.stopMusic('menu');
                },
                update: () => {}
            },
            PLAYING: {
                enter: () => {
                    this.game.world.init();
                    this.game.sound.playMusic('game');
                    this.game.network.connect();
                },
                exit: () => {
                    this.game.world.clear();
                    this.game.sound.stopMusic('game');
                    this.game.network.disconnect();
                },
                update: (delta) => {
                    this.game.world.update(delta);
                    this.game.physics.update(delta);
                    this.game.effects.update(delta);
                }
            },
            GAME_OVER: {
                enter: (data) => {
                    this.game.ui.showGameOver(data);
                    this.game.sound.play('gameOver');
                },
                exit: () => {
                    this.game.ui.hideGameOver();
                },
                update: () => {}
            },
            PAUSED: {
                enter: () => {
                    this.game.ui.showPause();
                    this.game.sound.pauseAll();
                },
                exit: () => {
                    this.game.ui.hidePause();
                    this.game.sound.resumeAll();
                },
                update: () => {}
            }
        };
    }

    setState(newState, data = null) {
        if (this.currentState === newState) return;

        if (this.currentState) {
            this.states[this.currentState].exit();
        }

        this.currentState = newState;
        this.states[this.currentState].enter(data);
        
        this.game.events.emit('stateChanged', {
            state: newState,
            data: data
        });
    }

    update(delta) {
        if (this.currentState) {
            this.states[this.currentState].update(delta);
        }
    }
} 
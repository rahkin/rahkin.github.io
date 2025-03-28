import { Game } from './Game';
import { EventSystem } from './EventSystem';
import { GameStateMachine } from './GameStateMachine';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { AdvancedParticleSystem } from '../effects/AdvancedParticleSystem';
import { VisualEffects } from '../effects/VisualEffects';
import { PowerUpManager } from '../gameplay/PowerUpManager';
import { AIController } from '../ai/AIController';

export class GameIntegration {
    constructor() {
        this.game = new Game();
        this.events = new EventSystem();
        this.stateMachine = new GameStateMachine(this);
        
        this.systems = {
            physics: new PhysicsSystem(this),
            particles: new AdvancedParticleSystem(this),
            effects: new VisualEffects(this),
            powerUps: new PowerUpManager(this)
        };

        this.setupEventListeners();
        this.init();
    }

    async init() {
        try {
            this.stateMachine.setState('LOADING');
            await this.game.init();
            this.stateMachine.setState('MENU');
        } catch (error) {
            console.error('Game initialization failed:', error);
            // Handle error appropriately
        }
    }

    setupEventListeners() {
        // Game state events
        this.events.on('gameStart', () => {
            this.stateMachine.setState('PLAYING');
        });

        this.events.on('gameOver', (data) => {
            this.stateMachine.setState('GAME_OVER', data);
        });

        this.events.on('pause', () => {
            this.stateMachine.setState('PAUSED');
        });

        // Gameplay events
        this.events.on('collision', (data) => {
            this.handleCollision(data);
        });

        this.events.on('powerUpCollected', (data) => {
            this.systems.powerUps.collect(data.snake, data.powerUp);
        });

        // Window events
        window.addEventListener('blur', () => {
            if (this.stateMachine.currentState === 'PLAYING') {
                this.events.emit('pause');
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.stateMachine.currentState === 'PLAYING') {
                this.events.emit('pause');
            }
        });
    }

    update(delta) {
        this.stateMachine.update(delta);
        
        if (this.stateMachine.currentState === 'PLAYING') {
            Object.values(this.systems).forEach(system => {
                system.update(delta);
            });
        }
    }

    handleCollision(data) {
        const { bodyA, bodyB, point, normal } = data;
        
        // Create collision effects
        this.systems.effects.createCollisionEffect(point, normal);
        this.systems.particles.emit(point, normal);
        
        // Handle gameplay logic
        if (bodyA.userData.type === 'snake' && bodyB.userData.type === 'snake') {
            this.handleSnakeCollision(bodyA.userData.snake, bodyB.userData.snake);
        } else if (bodyA.userData.type === 'snake' && bodyB.userData.type === 'powerUp') {
            this.events.emit('powerUpCollected', {
                snake: bodyA.userData.snake,
                powerUp: bodyB.userData.powerUp
            });
        }
    }

    handleSnakeCollision(snakeA, snakeB) {
        // Implement snake collision logic
        if (snakeA.canEliminate(snakeB)) {
            this.eliminateSnake(snakeB, snakeA);
        } else if (snakeB.canEliminate(snakeA)) {
            this.eliminateSnake(snakeA, snakeB);
        }
    }

    eliminateSnake(eliminated, eliminator) {
        this.events.emit('snakeEliminated', {
            eliminated: eliminated,
            eliminator: eliminator
        });
        
        // Create elimination effects
        this.systems.effects.createEliminationEffect(eliminated.position, eliminated.color);
        
        // Update scores
        eliminator.addScore(eliminated.length);
        
        // Remove eliminated snake
        eliminated.destroy();
    }

    cleanup() {
        this.events.clear();
        Object.values(this.systems).forEach(system => {
            system.clear();
        });
        this.game.cleanup();
    }
} 
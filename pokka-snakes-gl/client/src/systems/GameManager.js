import * as THREE from 'three';
import { Snake } from '../entities/Snake';
import { Pellet } from '../entities/Pellet';
import { PowerUp } from '../entities/PowerUp';
import { ObstacleSystem } from './ObstacleSystem';
import { PowerUpSystem } from './PowerUpSystem.js';

export class GameManager {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.isGameOver = false;
        this.collisionChecksEnabled = false;
        this.pellets = [];
        this.powerUps = new Set();
        this.powerUpSystem = new PowerUpSystem(game);
        this.obstacleSystem = new ObstacleSystem(game);
        
        this.settings = {
            maxPellets: 20,
            powerUpChance: 0.1,
            powerUpTypes: ['ghost', 'timeSlow', 'magnet', 'shield'],
            spawnInterval: 1000, // ms
            difficultyIncrease: 0.1
        };

        this.startDelay = 1000; // 1 second delay before enabling collisions
        this.startTime = 0;
        this.lastSpawnTime = 0;
        this.setupEventListeners();
    }

    setupRenderer() {
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.body.appendChild(this.renderer.domElement);
        } catch (error) {
            console.error('Error setting up renderer:', error);
        }
    }

    setupLights() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(this.ambientLight);

        // Directional light with shadows
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(1, 1, 1);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        // Hemisphere light
        this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
        this.scene.add(this.hemisphereLight);
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r') this.game.restart();
            if (e.key === 'p') this.togglePause();
        });
    }

    start() {
        console.log('GameManager: Starting game');
        this.isRunning = true;
        this.isGameOver = false;
        this.score = 0;
        this.pellets = [];
        this.totalPellets = 0;
        this.pelletSpawnInterval = 2;
        this.lastPelletSpawnTime = 0;
        this.collisionChecksEnabled = false;
        this.obstacleSystem.start();
        this.powerUpSystem.start();

        // Spawn initial pellets
        this.spawnInitialPellets();

        // Delay enabling collision checks until after snake initialization
        setTimeout(() => {
            this.collisionChecksEnabled = true;
            console.log('GameManager: Enabling collision checks', {
                hasObstacleSystem: !!this.obstacleSystem,
                obstacleCount: this.obstacleSystem.obstacles.length,
                snakePosition: this.game.snake?.head?.position,
                frameCount: this.game.frameCount
            });
        }, 1000); // Wait 1 second before enabling collision checks
    }

    stop() {
        console.log('GameManager: Stopping game');
        this.isRunning = false;
        this.isGameOver = false;
        this.collisionChecksEnabled = false;
        
        // Stop systems
        if (this.powerUpSystem) {
            this.powerUpSystem.cleanup();
        }
        if (this.obstacleSystem) {
            this.obstacleSystem.cleanup();
        }
        
        // Clean up game objects
        this.cleanup();
    }

    spawnInitialPellets() {
        // Spawn more initial pellets
        for (let i = 0; i < 5; i++) {
            this.spawnPellet();
        }
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        // Update systems
        this.powerUpSystem.update(deltaTime);
        this.obstacleSystem.update(deltaTime);

        // Check collisions if enabled
        if (this.collisionChecksEnabled) {
            this.checkCollisions();
        }
    }

    checkCollisions() {
        if (!this.collisionChecksEnabled || !this.game.snake) return;

        // Check wall collisions first
        if (this.game.snake.checkWallCollision()) {
            return;
        }

        // Check obstacle collisions
        if (this.game.snake.checkObstacleCollision()) {
            return;
        }

        // Check pellet collisions
        this.game.snake.checkPelletCollisions();
    }

    collectPellet(pellet) {
        if (!pellet || !this.game.snake || this.isGameOver) return;

        console.log('GameManager: Collecting pellet', {
            type: pellet.type,
            position: pellet.position.clone()
        });
        
        // Update score
        if (this.game.hud) {
            this.game.hud.updateScore(10);
        }
        
        // Remove the old pellet
        const index = this.pellets.indexOf(pellet);
        if (index > -1) {
            this.pellets.splice(index, 1);
        }
        pellet.cleanup();
        
        // Make the snake grow
        this.game.snake.addSegment();
        
        // Spawn a new pellet
        this.spawnPellet();
        
        // Play sound effect if available
        if (this.game.audio?.play) {
            this.game.audio.play('eat');
        }
    }

    collectPowerUp(powerUp) {
        if (this.game.powerUpSystem) {
            this.game.powerUpSystem.activatePowerUp(powerUp.type);
        }
        this.powerUps.delete(powerUp);
        powerUp.collect();
        
        // Play sound effect if available
        this.game.audio?.play('powerUp');
    }

    spawnPellet() {
        const type = Math.random() < 0.2 ? 'bonus' : 'normal';
        const worldSize = this.game.worldSize || 45;
        const halfSize = worldSize / 2;
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * worldSize,
            0.5,
            (Math.random() - 0.5) * worldSize
        );
        const pellet = new Pellet(this.game, position, type);
        this.pellets.push(pellet);
        console.log('GameManager: Spawned new pellet', {
            type,
            position: position.clone(),
            totalPellets: this.pellets.length,
            worldSize
        });
    }

    spawnPowerUp() {
        const type = this.settings.powerUpTypes[
            Math.floor(Math.random() * this.settings.powerUpTypes.length)
        ];
        const powerUp = new PowerUp(this.game, type);
        this.powerUps.add(powerUp);
    }

    handleSpawning() {
        const now = Date.now();
        if (now - this.lastSpawnTime > this.settings.spawnInterval) {
            if (this.pellets.length < this.settings.maxPellets) {
                if (Math.random() < this.settings.powerUpChance) {
                    this.spawnPowerUp();
                } else {
                    this.spawnPellet();
                }
            }
            this.lastSpawnTime = now;
        }
    }

    updateDifficulty(deltaTime) {
        this.settings.spawnInterval = Math.max(
            500,
            this.settings.spawnInterval - deltaTime * this.settings.difficultyIncrease
        );
        this.obstacleSystem.increaseDifficulty(deltaTime);
    }

    gameOver() {
        if (this.isGameOver) return;
        
        console.log('GameManager: Game over triggered', {
            snakePosition: this.game.snake.head.position.clone(),
            snakeLength: this.game.snake.segments.length,
            isRunning: this.isRunning,
            collisionChecksEnabled: this.collisionChecksEnabled,
            gameState: {
                isRunning: this.isRunning,
                isGameOver: this.isGameOver,
                collisionChecksEnabled: this.collisionChecksEnabled
            }
        });
        
        // Play game over sound
        if (this.game.audioManager) {
            this.game.audioManager.play('gameOver');
        }
        
        // Disable collision checks first
        this.collisionChecksEnabled = false;
        
        // Then update game state
        this.isGameOver = true;
        this.isRunning = false;
        
        // Ensure game over is handled properly
        if (this.game.handleGameOver) {
            this.game.handleGameOver();
        } else {
            console.error('GameManager: handleGameOver method not found on game instance');
        }
    }

    showGameOverScreen() {
        const gameOverElement = document.createElement('div');
        gameOverElement.className = 'game-over';
        gameOverElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 1000;
        `;
        
        gameOverElement.innerHTML = `
            <h1>Game Over</h1>
            <p>Score: ${this.game.hud.score}</p>
            <p>High Score: ${this.game.hud.highScore}</p>
            <button onclick="this.game.gameManager.restart()">Play Again</button>
        `;
        
        document.body.appendChild(gameOverElement);
    }

    restart() {
        console.log('GameManager: Restarting game');
        
        // Reset game state
        this.isRunning = true;
        this.isGameOver = false;
        this.collisionChecksEnabled = false;
        this.startTime = performance.now();
        
        // Reset settings
        this.settings.spawnInterval = 1000;
        
        // Clean up existing game objects
        this.cleanup();
        
        // Initialize fresh game state
        this.powerUpSystem.start();
        this.obstacleSystem.start();
        this.spawnInitialPellets();
        
        // Delay enabling collision checks
        setTimeout(() => {
            console.log('GameManager: Enabling collision checks');
            this.collisionChecksEnabled = true;
        }, 3000); // Increased delay to 3 seconds
        
        console.log('GameManager: Game restarted:', {
            isRunning: this.isRunning,
            pelletCount: this.pellets.length
        });
    }

    togglePause() {
        this.isRunning = !this.isRunning;
        if (this.isRunning) {
            this.startTime = performance.now();
            this.collisionChecksEnabled = false;
        }
    }

    cleanup() {
        console.log('GameManager: Cleaning up game objects');
        
        // Clean up pellets
        this.pellets.forEach(pellet => {
            if (pellet && pellet.cleanup) {
                pellet.cleanup();
            }
        });
        this.pellets = [];
        
        // Clean up power-ups
        this.powerUps.forEach(powerUp => {
            if (powerUp && powerUp.collect) {
                powerUp.collect();
            }
        });
        this.powerUps.clear();
        
        // Clean up obstacles
        if (this.obstacleSystem) {
            this.obstacleSystem.cleanup();
        }
    }

    addDecorations() {
        // Add some random rocks or obstacles for visual interest
        for (let i = 0; i < 20; i++) {
            const size = 0.5 + Math.random() * 1;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.7,
                metalness: 0.3
            });
            const rock = new THREE.Mesh(geometry, material);
            
            // Random position within bounds
            rock.position.x = (Math.random() - 0.5) * 80;
            rock.position.z = (Math.random() - 0.5) * 80;
            rock.position.y = size / 2;
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }
    }
} 
import * as THREE from 'three';
import { Snake } from '../entities/Snake';
import { Pellet } from '../entities/Pellet';
import { PowerUp } from '../entities/PowerUp';
import { ObstacleSystem } from './ObstacleSystem';

export class GameManager {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.pellets = new Set();
        this.powerUps = new Set();
        this.obstacleSystem = new ObstacleSystem(game);
        
        this.settings = {
            maxPellets: 20,
            powerUpChance: 0.1,
            powerUpTypes: ['speed', 'size', 'ghost', 'magnet', 'shield'],
            spawnInterval: 1000, // ms
            difficultyIncrease: 0.1
        };

        this.lastSpawnTime = 0;
        this.canCheckCollisions = false;
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
            if (e.key === 'r') this.restart();
            if (e.key === 'p') this.togglePause();
        });
    }

    start() {
        console.log('GameManager: Starting game');
        
        // Clean up any existing game state
        this.cleanup();
        
        // Initialize fresh game state
        this.isRunning = true;
        this.canCheckCollisions = false;
        this.lastSpawnTime = Date.now();
        this.settings.spawnInterval = 1000;
        
        // Initialize systems
        this.obstacleSystem.initialize();
        this.spawnInitialPellets();
        
        // Delay collision checks to prevent immediate game over
        setTimeout(() => {
            this.canCheckCollisions = true;
            console.log('GameManager: Collision checks enabled');
        }, 2000);
        
        console.log('GameManager: Game started:', {
            isRunning: this.isRunning,
            pelletCount: this.pellets.size
        });
    }

    spawnInitialPellets() {
        // Spawn initial pellets
        for (let i = 0; i < this.settings.maxPellets; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 90,
                0.3,
                (Math.random() - 0.5) * 90
            );
            const pellet = new Pellet(this.game, position);
            this.pellets.add(pellet);
        }
    }

    update(deltaTime) {
        if (!this.isRunning || !this.game || this.game.isGameOver) {
            return;
        }

        // Update game state
        if (this.game.snake) {
            // Handle collisions if enabled
            if (this.canCheckCollisions) {
                this.checkCollisions();
            }
            
            // Spawn new items
            this.handleSpawning();
            
            // Update difficulty
            this.updateDifficulty(deltaTime);
        }
    }

    handleSpawning() {
        const now = Date.now();
        if (now - this.lastSpawnTime > this.settings.spawnInterval) {
            if (this.pellets.size < this.settings.maxPellets) {
                if (Math.random() < this.settings.powerUpChance) {
                    this.spawnPowerUp();
                } else {
                    this.spawnPellet();
                }
            }
            this.lastSpawnTime = now;
        }
    }

    spawnPellet() {
        const type = Math.random() < 0.2 ? 'bonus' : 'normal';
        const pellet = new Pellet(this.game, null, type);
        this.pellets.add(pellet);
    }

    spawnPowerUp() {
        const type = this.settings.powerUpTypes[
            Math.floor(Math.random() * this.settings.powerUpTypes.length)
        ];
        const powerUp = new PowerUp(this.game, type);
        this.powerUps.add(powerUp);
    }

    checkCollisions() {
        if (!this.game.snake || !this.canCheckCollisions) return;

        // Check pellet collisions
        this.pellets.forEach(pellet => {
            if (this.game.snake.checkCollision(pellet.mesh)) {
                this.collectPellet(pellet);
            }
        });

        // Check power-up collisions
        this.powerUps.forEach(powerUp => {
            if (this.game.snake.checkCollision(powerUp.mesh)) {
                this.collectPowerUp(powerUp);
            }
        });

        // Check obstacle collisions
        if (this.obstacleSystem.checkCollisions(this.game.snake)) {
            this.gameOver();
        }

        // Check self collision (only if snake has enough segments and is not in ghost mode)
        if (this.game.snake.segments.length > 4 && !this.game.snake.isGhost && this.game.snake.checkCollision()) {
            this.gameOver();
        }
    }

    collectPellet(pellet) {
        const points = pellet.value || 10;
        if (this.game.hud) {
            this.game.hud.updateScore(points);
        }
        
        // Make the snake grow
        if (this.game.snake) {
            this.game.snake.grow();
            console.log('Growing snake, current segments:', this.game.snake.segments.length);
        }
        
        this.pellets.delete(pellet);
        pellet.collect();
        
        // Spawn a new pellet to replace the collected one
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 90,
            0.3,
            (Math.random() - 0.5) * 90
        );
        const newPellet = new Pellet(this.game, position);
        this.pellets.add(newPellet);
        
        // Play sound effect if available
        this.game.audio?.playSound('collect');
    }

    collectPowerUp(powerUp) {
        powerUp.applyEffect(this.game.snake);
        this.powerUps.delete(powerUp);
        powerUp.collect();
        
        // Play sound effect if available
        this.game.audio?.playSound('powerup');
    }

    updateDifficulty(deltaTime) {
        this.settings.spawnInterval = Math.max(
            500,
            this.settings.spawnInterval - deltaTime * this.settings.difficultyIncrease
        );
        this.obstacleSystem.increaseDifficulty(deltaTime);
    }

    gameOver() {
        console.log('GameManager: Game over');
        this.isRunning = false;
        if (this.game) {
            this.game.gameOver();
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
        this.canCheckCollisions = false;
        this.lastSpawnTime = Date.now();
        
        // Reset settings
        this.settings.spawnInterval = 1000;
        
        // Clean up existing game objects
        this.cleanup();
        
        // Initialize fresh game state
        this.obstacleSystem.initialize();
        this.spawnInitialPellets();
        
        // Delay collision checks to prevent immediate game over
        setTimeout(() => {
            this.canCheckCollisions = true;
            console.log('GameManager: Collision checks enabled');
        }, 2000);
        
        console.log('GameManager: Game restarted:', {
            isRunning: this.isRunning,
            pelletCount: this.pellets.size
        });
    }

    togglePause() {
        this.isRunning = !this.isRunning;
    }

    cleanup() {
        console.log('GameManager: Cleaning up game objects');
        
        // Clean up pellets
        this.pellets.forEach(pellet => {
            if (pellet && pellet.collect) {
                pellet.collect();
            }
        });
        this.pellets.clear();
        
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
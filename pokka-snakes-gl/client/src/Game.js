import * as THREE from 'three';
import { AdvancedCameraController } from './camera/AdvancedCameraController';
import { Snake } from './entities/Snake';
import { Pellet } from './entities/Pellet';
import { GameManager } from './systems/GameManager';
import { HUD } from './ui/HUD';
import { PowerUpSystem } from './systems/PowerUpSystem';
// Import other systems as needed
// import { NetworkManager } from './network/NetworkManager';
// import { GameStateManager } from './systems/GameStateManager';
// etc...

export class Game {
    constructor() {
        // Initialize core components first
        this.initializeCore();
        
        this.lastTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.lastPelletSpawnTime = 0;
        this.pelletSpawnInterval = 2; // Spawn a pellet every 2 seconds
        this.specialPelletChance = 0.2; // 20% chance for special pellets
        this.frameCount = 0;

        // Initialize input manager with direction vectors
        this.inputManager = {
            keys: new Set(),
            directions: {
                'ArrowUp': new THREE.Vector3(0, 0, -1),
                'ArrowDown': new THREE.Vector3(0, 0, 1),
                'ArrowLeft': new THREE.Vector3(-1, 0, 0),
                'ArrowRight': new THREE.Vector3(1, 0, 0),
                'w': new THREE.Vector3(0, 0, -1),
                'a': new THREE.Vector3(-1, 0, 0),
                's': new THREE.Vector3(0, 0, 1),
                'd': new THREE.Vector3(1, 0, 0)
            }
        };

        // Then initialize game systems
        this.initializeSystems();

        // Start the game
        this.start();
    }

    initializeCore() {
        // Set up scene first
        this.setupScene();
        
        // Set up renderer
        this.setupRenderer();
        
        // Set up camera
        this.setupCamera();

        // Set up lights
        this.setupLights();
        
        // Create basic scene with ground
        this.createBasicScene();
        
        // Set up input
        this.setupInput();
        
        // Set up HUD last
        this.hud = new HUD(this);
    }

    initializeSystems() {
        // Initialize game manager first
        this.gameManager = new GameManager(this);
        
        // Initialize power-up system
        this.powerUpSystem = new PowerUpSystem(this);
        
        // Create snake at the center of the scene
        const startPosition = new THREE.Vector3(0, 0.5, 0);
        this.snake = new Snake(this, startPosition);

        // Set snake as camera target
        if (this.cameraController) {
            this.cameraController.setTarget(this.snake.head);
        }

        // Initialize other systems
        this.gameManager.start();

        // Add window resize handler
        window.addEventListener('resize', this.onResize.bind(this));
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
            
            // Clear any existing canvas
            const existingCanvas = document.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            
            document.body.appendChild(this.renderer.domElement);
            
            console.log('Game: Renderer initialized', {
                width: window.innerWidth,
                height: window.innerHeight,
                pixelRatio: this.renderer.getPixelRatio(),
                shadowsEnabled: this.renderer.shadowMap.enabled
            });
        } catch (error) {
            console.error('Error setting up renderer:', error);
            throw error; // Re-throw to prevent game from continuing without renderer
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
    }

    setupCamera() {
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Set initial camera position
        this.camera.position.set(0, 15, 20);
        this.camera.lookAt(0, 0, 0);

        // Initialize camera controller after camera is set up
        try {
            this.cameraController = new AdvancedCameraController(this);
        } catch (error) {
            console.warn('Error initializing camera controller:', error);
            // Fallback to basic camera if controller fails
            this.camera.position.set(0, 30, 30);
            this.camera.lookAt(0, 0, 0);
        }
    }

    setupLights() {
        // Ambient light with reduced intensity for better shadow contrast
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);

        // Directional light with enhanced shadows
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.bias = -0.0001;
        this.scene.add(this.directionalLight);

        // Hemisphere light for better ambient lighting
        this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(this.hemisphereLight);
    }

    setupInput() {
        const handleKeyDown = (e) => {
            // Prevent default behavior for game controls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
                e.preventDefault();
                
                // Get direction from input manager
                const direction = this.inputManager.directions[e.key];
                if (direction && this.snake) {
                    console.log('Game: Key pressed', {
                        key: e.key,
                        direction: direction.clone(),
                        currentSnakeDirection: this.snake.direction ? this.snake.direction.clone() : null,
                        snakePosition: this.snake.head.position.clone()
                    });
                    this.snake.setDirection(direction);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
    }

    createBasicScene() {
        // Create ground plane with enhanced material
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.9,
            metalness: 0.1,
            envMapIntensity: 1,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Add grid helper for better visual reference
        const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // Add decorative elements
        this.addDecorations();
    }

    start() {
        if (!this.isRunning) {
            // Ensure we have all required components
            if (!this.renderer || !this.scene || !this.camera) {
                console.error('Game: Missing required components', {
                    hasRenderer: !!this.renderer,
                    hasScene: !!this.scene,
                    hasCamera: !!this.camera
                });
                return;
            }

            console.log('Game: Starting game');
            this.isRunning = true;
            this.isGameOver = false;
            this.lastTime = performance.now();
            
            // Start animation loop
            this.animate();
            
            console.log('Game: Started', {
                isRunning: this.isRunning,
                hasSnake: !!this.snake,
                hasGameManager: !!this.gameManager,
                cameraPosition: this.camera.position.clone(),
                rendererSize: {
                    width: this.renderer.domElement.width,
                    height: this.renderer.domElement.height
                }
            });
        }
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        this.frameCount++;

        // Update snake first
        if (this.snake) {
            this.snake.update(deltaTime);
        }

        // Update game systems
        if (this.gameManager) {
            this.gameManager.update(deltaTime);
        }

        // Update power-up system
        if (this.powerUpSystem) {
            this.powerUpSystem.update(deltaTime);
        }

        // Update camera controller
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        } else {
            // Fallback camera following if controller not available
            if (this.camera && this.snake && this.snake.head) {
                this.camera.position.x = this.snake.head.position.x;
                this.camera.position.z = this.snake.head.position.z + 20;
                this.camera.position.y = 15;
                this.camera.lookAt(this.snake.head.position);
            }
        }

        // Always render the scene
        if (this.renderer && this.scene && this.camera) {
            try {
                this.renderer.render(this.scene, this.camera);
            } catch (error) {
                console.error('Game: Error rendering scene:', error);
                this.isRunning = false;
                return;
            }
        }

        // Check for game over conditions
        if (this.gameManager && this.gameManager.isGameOver) {
            this.handleGameOver();
            return;
        }

        // Continue animation loop
        requestAnimationFrame(() => this.animate());
    }

    update() {
        if (!this.isRunning || this.gameManager.isGameOver) {
            console.log('Game: Update stopped - game not running or game over');
            return;
        }

        try {
            // Update game systems
            this.gameManager.update();
            
            // Update camera
            this.cameraController.update();
            
            // Render the scene
            this.renderer.render(this.scene, this.camera);
            
            // Continue the game loop
            this.animationFrameId = requestAnimationFrame(() => this.update());
        } catch (error) {
            console.error('Game: Error in update loop:', error);
            this.stop();
        }
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (this.camera && this.renderer) {
            // Update camera
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            // Update renderer
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    cleanup() {
        this.isRunning = false;

        // Remove event listeners
        window.removeEventListener('resize', this.onResize.bind(this));

        // Cleanup HUD
        if (this.hud) {
            this.hud.cleanup();
        }

        // Dispose of Three.js objects
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        // Cleanup camera controller
        if (this.cameraController) {
            this.cameraController.cleanup();
        }

        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }

        if (this.gameManager) {
            this.gameManager.cleanup();
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
            
            // Random position within bounds (reduced from 80 to 40)
            rock.position.x = (Math.random() - 0.5) * 40;
            rock.position.z = (Math.random() - 0.5) * 40;
            rock.position.y = size / 2;
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }
    }

    restart() {
        console.log('Game: Restarting game');
        
        // Stop the current game
        this.isRunning = false;
        this.isGameOver = false;
        this.frameCount = 0; // Reset frame count on restart
        
        // Clean up existing snake
        if (this.snake) {
            this.snake.cleanup();
            this.snake = null;
        }

        // Clean up game manager
        if (this.gameManager) {
            this.gameManager.stop();
        }

        // Clean up power-up system if it exists
        if (this.powerUpSystem) {
            try {
                this.powerUpSystem.stop();
            } catch (error) {
                console.warn('Game: Error stopping power-up system:', error);
            }
        }

        // Reset camera position first
        if (this.camera) {
            this.camera.position.set(0, 15, 20);
            this.camera.lookAt(0, 0, 0);
        }

        // Clear the scene except for lights, ground, and grid
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object !== this.scene && 
                object !== this.ground && 
                object !== this.ambientLight && 
                object !== this.directionalLight && 
                object !== this.hemisphereLight &&
                !(object instanceof THREE.GridHelper)) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });

        // Reinitialize lighting if needed
        if (!this.ambientLight) {
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(this.ambientLight);
        }

        // Recreate basic scene elements if needed
        if (!this.ground) {
            this.createBasicScene();
        }

        // Create new snake at the center
        const startPosition = new THREE.Vector3(0, 0.5, 0);
        this.snake = new Snake(this, startPosition);

        // Set snake as camera target
        if (this.cameraController) {
            this.cameraController.setTarget(this.snake.head);
        }

        // Reinitialize game systems
        this.gameManager = new GameManager(this);
        this.powerUpSystem = new PowerUpSystem(this);

        // Start game systems
        this.gameManager.start();
        this.powerUpSystem.start();
        this.isRunning = true;
        this.isGameOver = false;

        // Start the animation loop
        this.animate();

        console.log('Game: Restart complete', {
            isRunning: this.isRunning,
            isGameOver: this.isGameOver,
            hasSnake: !!this.snake,
            hasPowerUpSystem: !!this.powerUpSystem,
            snakePosition: this.snake?.head?.position,
            groundExists: !!this.ground
        });
    }

    handleGameOver() {
        if (this.isGameOver) return;
        
        console.log('Game: Handling game over');
        
        this.isGameOver = true;
        this.isRunning = false;
        
        // Stop game manager first
        if (this.gameManager) {
            this.gameManager.gameOver();
        }
        
        // Show game over screen
        if (this.hud) {
            // Small delay to ensure state is updated
            setTimeout(() => {
                this.hud.showGameOver();
                console.log('Game: Game over screen shown', {
                    isRunning: this.isRunning,
                    isGameOver: this.isGameOver,
                    hasSnake: !!this.snake,
                    score: this.hud.score
                });
            }, 100);
        }
    }

    stop() {
        console.log('Game: Stopping game');
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        
        // Ensure game over screen is visible
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'flex';
            console.log('Game: Game over screen displayed');
        }
    }
} 
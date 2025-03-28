import * as THREE from 'three';
import { AdvancedCameraController } from './camera/AdvancedCameraController';
import { Snake } from './entities/Snake';
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
        // Then initialize systems that depend on core components
        this.initializeSystems();
        
        this.lastTime = 0;
        this.isRunning = false;

        // Add resize handler
        window.addEventListener('resize', this.onResize.bind(this));

        // Add input handling
        this.inputManager = {
            keys: new Set(),
            directions: {
                'ArrowUp': new THREE.Vector3(0, 0, -1),
                'ArrowDown': new THREE.Vector3(0, 0, 1),
                'ArrowLeft': new THREE.Vector3(-1, 0, 0),
                'ArrowRight': new THREE.Vector3(1, 0, 0),
                'w': new THREE.Vector3(0, 0, -1),
                's': new THREE.Vector3(0, 0, 1),
                'a': new THREE.Vector3(-1, 0, 0),
                'd': new THREE.Vector3(1, 0, 0)
            }
        };

        this.setupInputListeners();
    }

    initializeCore() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupInput();
    }

    initializeSystems() {
        this.gameManager = new GameManager(this);
        this.hud = new HUD(this);
        this.powerUpSystem = new PowerUpSystem(this);
        this.createBasicScene();
        this.gameManager.start();
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

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 40);
        this.cameraController = new AdvancedCameraController(this);
    }

    setupLights() {
        // Ambient light with reduced intensity for better shadow contrast
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);

        // Directional light with enhanced shadows
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        this.directionalLight.position.set(5, 5, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.bias = -0.0001;
        this.scene.add(this.directionalLight);

        // Hemisphere light with reduced intensity
        this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(this.hemisphereLight);
    }

    setupInput() {
        this.input = {
            keys: {},
            mouse: {
                position: new THREE.Vector2(),
                isPressed: false
            }
        };

        window.addEventListener('keydown', (e) => {
            this.input.keys[e.key] = true;
            if (this.snake) {
                const direction = this.inputManager.directions[e.key];
                if (direction) {
                    this.snake.setDirection(direction);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.input.keys[e.key] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.input.mouse.position.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.input.mouse.position.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('mousedown', () => {
            this.input.mouse.isPressed = true;
        });

        window.addEventListener('mouseup', () => {
            this.input.mouse.isPressed = false;
        });
    }

    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.inputManager.keys.add(e.key);
        });

        window.addEventListener('keyup', (e) => {
            this.inputManager.keys.delete(e.key);
        });
    }

    createBasicScene() {
        // Create ground plane with enhanced material
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.9,
            metalness: 0.1,
            envMapIntensity: 1,
            side: THREE.DoubleSide,
            flatShading: true,
            wireframe: false,
            emissive: 0x1a2634,
            emissiveIntensity: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add decorative elements
        this.addDecorations();

        // Create snake at a safe starting position
        const startPosition = new THREE.Vector3(0, 0.5, 0);
        this.snake = new Snake(this, startPosition);
        this.scene.add(this.snake.group);

        // Set up camera to follow snake
        if (this.cameraController) {
            this.cameraController.setTarget(this.snake.head);
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animate();
        }
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;

        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();
    }

    update(deltaTime) {
        // Handle input
        this.handleInput();

        // Update snake if it exists
        if (this.snake) {
            this.snake.update(deltaTime);
        }

        if (this.gameManager) {
            this.gameManager.update(deltaTime);
        }

        if (this.powerUpSystem) {
            this.powerUpSystem.update();
        }

        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }

        // Update HUD
        if (this.hud) {
            this.hud.render();
        }
    }

    handleInput() {
        if (!this.snake) return;

        // Check for movement keys
        for (const key in this.input.keys) {
            if (this.input.keys[key]) {
                const direction = this.inputManager.directions[key];
                if (direction) {
                    this.snake.setDirection(direction);
                    break; // Only use the first valid direction key pressed
                }
            }
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
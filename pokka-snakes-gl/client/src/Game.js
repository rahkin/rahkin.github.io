import * as THREE from 'three';
import { AdvancedCameraController } from './camera/AdvancedCameraController';
import { Snake } from './entities/Snake';
import { Pellet } from './entities/Pellet';
import { GameManager } from './systems/GameManager';
import { HUD } from './ui/HUD';
import { PowerUpSystem } from './systems/PowerUpSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { AudioManager } from './systems/AudioManager';
// Import other systems as needed
// import { NetworkManager } from './network/NetworkManager';
// import { GameStateManager } from './systems/GameStateManager';
// etc...

export class Game {
    constructor() {
        // Initialize core components first
        this.initializeCore();
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        
        this.lastTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.lastPelletSpawnTime = 0;
        this.pelletSpawnInterval = 2; // Spawn a pellet every 2 seconds
        this.specialPelletChance = 0.2; // 20% chance for special pellets
        this.frameCount = 0;
        this.dayNightCycle = 0; // Track day/night cycle
        this.particles = []; // Store particle effects
        this.snakeTrail = []; // Store snake trail particles
        this.weatherChangeInterval = 30; // Change weather every 30 seconds
        this.lastWeatherChange = 0;

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

        // Initialize weather system
        this.weatherSystem = new WeatherSystem(this.scene);
        
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
        this.scene.background = new THREE.Color(0xFFFFFF);
        this.scene.fog = new THREE.FogExp2(0xFFFFFF, 0.01);
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
        // Warm ambient light matching the photo's sunlit atmosphere
        this.ambientLight = new THREE.AmbientLight(0xFFE4B5, 0.4);
        this.scene.add(this.ambientLight);

        // Main sunlight with warm tone
        this.directionalLight = new THREE.DirectionalLight(0xFFE4B5, 1.0);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.bias = -0.0001;
        this.scene.add(this.directionalLight);

        // Soft fill light for shadows
        this.hemisphereLight = new THREE.HemisphereLight(0xF5E6D3, 0x4A3728, 0.6);
        this.scene.add(this.hemisphereLight);

        // Add spotlights for giant coffee cups
        const cupPositions = [
            [-80, 0, -80], [80, 0, -80],
            [-80, 0, 80], [80, 0, 80]
        ];

        cupPositions.forEach(pos => {
            const spotlight = new THREE.SpotLight(0xFFE4B5, 1);
            spotlight.position.set(pos[0], 15, pos[2]);
            spotlight.target.position.set(pos[0], 0, pos[2]);
            spotlight.angle = Math.PI / 6;
            spotlight.penumbra = 0.3;
            spotlight.decay = 1.5;
            spotlight.distance = 30;
            spotlight.castShadow = true;
            this.scene.add(spotlight);
            this.scene.add(spotlight.target);
        });
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
        // Create ground plane with white material for the play area
        const groundGeometry = new THREE.PlaneGeometry(100, 100); // Reduced size to match play area
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.3,
            envMapIntensity: 1,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0.01; // Slightly raised to prevent z-fighting
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Add stylish grid with subtle colors on white
        const gridHelper = new THREE.GridHelper(100, 20, 0xE0E0E0, 0xF0F0F0);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        gridHelper.position.y = 0.02; // Slightly above the ground
        this.scene.add(gridHelper);

        // Add coffee shop environment
        this.createCoffeeShopEnvironment();

        // Add decorative elements
        this.addDecorations();
    }

    createCoffeeShopEnvironment() {
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown color as fallback
            roughness: 0.8,
            metalness: 0.2
        });

        // Try to load wood texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            './textures/wood_floor.jpg',
            (texture) => {
                floorMaterial.map = texture;
                floorMaterial.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn('Failed to load wood floor texture:', error);
                // Keep using the default brown color
            }
        );

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);

        // Add a base floor to cover any gaps
        const baseFloorGeometry = new THREE.PlaneGeometry(300, 300);
        const baseFloorMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const baseFloor = new THREE.Mesh(baseFloorGeometry, baseFloorMaterial);
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.position.y = -0.01; // Slightly below everything
        baseFloor.receiveShadow = true;
        this.scene.add(baseFloor);

        // Add tables and chairs
        this.addFurniture();

        // Add kiosk
        this.addKiosk();

        // Add NPCs
        this.addNPCs();

        // Add ambient coffee shop props
        this.addCoffeeShopProps();
    }

    addFurniture() {
        // Create table geometry with warm wood color from the photo
        const tableGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 16); // Increased table size
        const tableMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513, // Warm wood tone
            shininess: 30
        });

        // Create chair geometry with soft pink from Pokka's shirt - scaled up
        const chairGeometry = new THREE.BoxGeometry(1.2, 1.8, 1.2); // Increased chair size
        const chairMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFB6C6, // Soft pink
            shininess: 30
        });

        // Place tables and chairs in a pattern - moved closer to watch the game
        const tablePositions = [
            [-50, 0, -50], [-50, 0, -30], [-50, 0, -10],
            [50, 0, -50], [50, 0, -30], [50, 0, -10],
            [-50, 0, 10], [-50, 0, 30], [-50, 0, 50],
            [50, 0, 10], [50, 0, 30], [50, 0, 50]
        ];

        tablePositions.forEach(pos => {
            // Add table - fixed orientation
            const table = new THREE.Mesh(tableGeometry, tableMaterial);
            table.position.set(pos[0], pos[1] + 0.25, pos[2]); // Raised by half height to sit on ground
            table.castShadow = true;
            table.receiveShadow = true;
            this.scene.add(table);

            // Add chairs around the table - scaled up and properly positioned
            const chairOffsets = [
                [-3.5, 0, 0], [3.5, 0, 0],
                [0, 0, -3.5], [0, 0, 3.5]
            ];

            chairOffsets.forEach(offset => {
                const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                chair.position.set(
                    pos[0] + offset[0],
                    pos[1] + 0.9, // Half chair height
                    pos[2] + offset[2]
                );
                chair.castShadow = true;
                chair.receiveShadow = true;
                this.scene.add(chair);
            });
        });
    }

    addKiosk() {
        // Create main kiosk structure with cream color from the walls - scaled up
        const kioskGeometry = new THREE.BoxGeometry(15, 6, 6); // Increased size
        const kioskMaterial = new THREE.MeshPhongMaterial({
            color: 0xF5E6D3, // Cream color
            shininess: 50
        });

        const kiosk = new THREE.Mesh(kioskGeometry, kioskMaterial);
        kiosk.position.set(0, 3, -70); // Adjusted height for new size
        kiosk.castShadow = true;
        kiosk.receiveShadow = true;
        this.scene.add(kiosk);

        // Add counter top with coffee brown - scaled up
        const counterGeometry = new THREE.BoxGeometry(18, 0.3, 7); // Increased size
        const counterMaterial = new THREE.MeshPhongMaterial({
            color: 0x4A3728, // Deep coffee brown
            shininess: 60
        });

        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(0, 6, -69); // Adjusted height for new size
        counter.castShadow = true;
        counter.receiveShadow = true;
        this.scene.add(counter);

        // Add coffee machines and props
        this.addCoffeeShopProps();

        // Add plants around the kiosk
        this.addPlants();
    }

    addNPCs() {
        // Create simple NPC geometries - scaled up
        const bodyGeometry = new THREE.CapsuleGeometry(0.8, 1.5, 4, 8); // Increased size
        const headGeometry = new THREE.SphereGeometry(0.6, 16, 16); // Increased size

        // Create NPCs with different colors - moved closer to watch
        const npcPositions = [
            // Customers at tables
            [-50, 0, -50], [50, 0, -30], [-50, 0, 10], [50, 0, 50],
            // Baristas behind kiosk
            [-3, 0, -68], [3, 0, -68]
        ];

        npcPositions.forEach((pos, index) => {
            const isBarista = index >= npcPositions.length - 2;
            const npcColor = isBarista ? 0x3EE0B1 : 0xE179DA;

            // Create body
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: npcColor,
                shininess: 30
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.set(pos[0], pos[1] + 2.25, pos[2]); // Adjusted height for new size
            body.castShadow = true;
            this.scene.add(body);

            // Create head
            const headMaterial = new THREE.MeshPhongMaterial({
                color: npcColor,
                shininess: 30
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.set(pos[0], pos[1] + 4, pos[2]); // Adjusted height for new size
            head.castShadow = true;
            this.scene.add(head);

            // Store reference for animation
            const npc = { body, head, initialY: pos[1] + 2.25 };
            npc.floatSpeed = 0.5 + Math.random() * 0.5;
            npc.floatOffset = Math.random() * Math.PI * 2;
            this.npcs = this.npcs || [];
            this.npcs.push(npc);
        });
    }

    addPlants() {
        // Create plant pots with plants - scaled up
        const potPositions = [
            [-8, 0, -68], [8, 0, -68],  // Next to kiosk
            [-50, 0, -70], [50, 0, -70], // Corners
            [-50, 0, 70], [50, 0, 70]    // Back corners
        ];

        potPositions.forEach(pos => {
            // Create pot - scaled up
            const potGeometry = new THREE.CylinderGeometry(1.2, 0.9, 1.8, 16);
            const potMaterial = new THREE.MeshPhongMaterial({
                color: 0x4A3728, // Deep brown
                shininess: 30
            });
            const pot = new THREE.Mesh(potGeometry, potMaterial);
            pot.position.set(...pos);
            pot.castShadow = true;
            pot.receiveShadow = true;
            this.scene.add(pot);

            // Create plant foliage - scaled up
            const foliageGeometry = new THREE.SphereGeometry(1.5, 16, 16);
            const foliageMaterial = new THREE.MeshPhongMaterial({
                color: 0x7EA479, // Soft green
                shininess: 20
            });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(pos[0], pos[1] + 2.25, pos[2]);
            foliage.scale.set(1.5, 2.25, 1.5);
            foliage.castShadow = true;
            this.scene.add(foliage);
        });
    }

    addCoffeeShopProps() {
        // Add coffee machines on the kiosk
        const machinePosX = [-4, 0, 4];
        machinePosX.forEach(x => {
            const machine = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1),
                new THREE.MeshPhongMaterial({
                    color: 0xFFFFFF, // Pure white like the coffee cup
                    shininess: 90
                })
            );
            machine.position.set(x, 4.85, -69);
            machine.castShadow = true;
            this.scene.add(machine);
        });

        // Add giant decorative coffee cups
        const cupPositions = [
            { pos: [-80, 0, -80], rotation: 0.4 },  // Further out in corners
            { pos: [80, 0, -80], rotation: -0.4 },
            { pos: [-80, 0, 80], rotation: 0.3 },
            { pos: [80, 0, 80], rotation: -0.3 }
        ];

        cupPositions.forEach(({pos, rotation}) => {
            // Create cup body - made slightly larger for visibility at distance
            const cupBody = new THREE.Mesh(
                new THREE.CylinderGeometry(4, 3, 8, 32),  // Increased size
                new THREE.MeshPhongMaterial({
                    color: 0xFFFFFF,
                    shininess: 100
                })
            );
            cupBody.position.set(pos[0], pos[1] + 4, pos[2]);  // Raised higher
            cupBody.rotation.y = rotation;
            cupBody.castShadow = true;
            this.scene.add(cupBody);

            // Create handle - scaled up proportionally
            const handleTorus = new THREE.Mesh(
                new THREE.TorusGeometry(2, 0.5, 16, 32),  // Increased size
                new THREE.MeshPhongMaterial({
                    color: 0xFFFFFF,
                    shininess: 100
                })
            );
            handleTorus.position.set(pos[0] + 4, pos[1] + 4, pos[2]);  // Adjusted for new cup size
            handleTorus.rotation.y = rotation + Math.PI / 2;
            handleTorus.castShadow = true;
            this.scene.add(handleTorus);

            // Create saucer - scaled up proportionally
            const saucer = new THREE.Mesh(
                new THREE.CylinderGeometry(5.5, 5.7, 0.4, 32),  // Increased size
                new THREE.MeshPhongMaterial({
                    color: 0xFFFFFF,
                    shininess: 100
                })
            );
            saucer.position.set(pos[0], pos[1] + 0.2, pos[2]);
            saucer.rotation.y = rotation;
            saucer.castShadow = true;
            this.scene.add(saucer);

            // Add coffee liquid - scaled up proportionally
            const coffee = new THREE.Mesh(
                new THREE.CylinderGeometry(3.8, 3.8, 0.1, 32),  // Increased size
                new THREE.MeshPhongMaterial({
                    color: 0x4A3728, // Deep coffee brown
                    shininess: 60,
                    transparent: true,
                    opacity: 0.9
                })
            );
            coffee.position.set(pos[0], pos[1] + 7.5, pos[2]);  // Adjusted for new height
            coffee.rotation.y = rotation;
            this.scene.add(coffee);

            // Add steam particles - made larger and higher
            for (let i = 0; i < 5; i++) {
                const steam = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 8, 8),  // Slightly larger steam
                    new THREE.MeshPhongMaterial({
                        color: 0xFFFFFF,
                        transparent: true,
                        opacity: 0.3
                    })
                );
                steam.position.set(
                    pos[0] + (Math.random() - 0.5) * 3,  // Wider spread
                    pos[1] + 8 + i * 1,  // Higher steam
                    pos[2] + (Math.random() - 0.5) * 3   // Wider spread
                );
                steam.userData.initialY = steam.position.y;
                steam.userData.floatSpeed = 0.3 + Math.random() * 0.2;
                steam.userData.floatOffset = Math.random() * Math.PI * 2;
                this.scene.add(steam);
            }
        });

        // Add hanging lights with warm glow
        const lightPositions = [
            [-60, 8, -60], [-60, 8, 0], [-60, 8, 60],
            [60, 8, -60], [60, 8, 0], [60, 8, 60]
        ];

        lightPositions.forEach(pos => {
            // Light fixture
            const fixture = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.4, 1, 16),
                new THREE.MeshPhongMaterial({
                    color: 0xFFE4B5, // Warm light
                    emissive: 0xFFE4B5,
                    emissiveIntensity: 0.5
                })
            );
            fixture.position.set(...pos);
            this.scene.add(fixture);

            // Add point light with warm color
            const light = new THREE.PointLight(0xFFE4B5, 0.8, 20);
            light.position.set(...pos);
            this.scene.add(light);
        });
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
            
            // Start background music
            this.audioManager.play('background');
            
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

        // Create snake trail with varying colors based on time of day
        if (this.frameCount % 2 === 0) {
            this.createSnakeTrail();
        }

        // Update all particle systems
        this.updateParticles(deltaTime);
        this.updateSnakeTrail(deltaTime);
        this.updateDayNightCycle(deltaTime);

        // Animate ambient particles
        this.scene.children.forEach(child => {
            if (child.userData.floatSpeed) {
                // Vertical floating motion
                const floatY = Math.sin(currentTime * 0.001 * child.userData.floatSpeed + child.userData.floatOffset) * 0.5;
                child.position.y = child.userData.initialY + floatY;

                // Horizontal drifting motion for dust particles
                if (child.userData.driftSpeed) {
                    child.position.x += child.userData.driftSpeed.x * deltaTime;
                    child.position.z += child.userData.driftSpeed.z * deltaTime;

                    // Wrap around when particles drift too far
                    if (Math.abs(child.position.x) > 80) child.position.x *= -0.9;
                    if (Math.abs(child.position.z) > 80) child.position.z *= -0.9;
                }
            }
        });

        // Animate NPCs
        if (this.npcs) {
            this.npcs.forEach(npc => {
                const floatY = Math.sin(currentTime * 0.001 * npc.floatSpeed + npc.floatOffset) * 0.1;
                npc.body.position.y = npc.initialY + floatY;
                npc.head.position.y = npc.initialY + 1.2 + floatY;
            });
        }

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

        // Update weather system
        this.weatherSystem.update(deltaTime);

        // Randomly change weather
        if (this.currentTime - this.lastWeatherChange > this.weatherChangeInterval) {
            const weatherTypes = ['sunny', 'rain', 'snow'];
            const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
            this.weatherSystem.setWeather(randomWeather);
            this.audioManager.setWeather(randomWeather); // Update weather sounds
            this.lastWeatherChange = this.currentTime;
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

        // Cleanup audio manager
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
    }

    addDecorations() {
        // Add floating orbs with Pokka's colors
        for (let i = 0; i < 30; i++) {
            const size = 0.2 + Math.random() * 0.3;
            const geometry = new THREE.SphereGeometry(size, 16, 16);
            
            // Alternate between Pokka's colors
            const colors = [0x3EE0B1, 0xFAA70D, 0xE179DA];
            const material = new THREE.MeshPhongMaterial({
                color: colors[i % 3],
                emissive: colors[i % 3],
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.7,
                shininess: 30
            });
            
            const orb = new THREE.Mesh(geometry, material);
            
            // Position orbs in a more interesting pattern
            const radius = 20 + Math.random() * 20;
            const angle = (i / 30) * Math.PI * 2;
            orb.position.x = Math.cos(angle) * radius;
            orb.position.z = Math.sin(angle) * radius;
            orb.position.y = 2 + Math.random() * 8; // Float at different heights
            
            // Store initial position for animation
            orb.userData.initialY = orb.position.y;
            orb.userData.floatSpeed = 0.5 + Math.random() * 0.5;
            orb.userData.floatOffset = Math.random() * Math.PI * 2;
            
            orb.castShadow = true;
            this.scene.add(orb);
        }

        // Add some ground decorations
        for (let i = 0; i < 15; i++) {
            const geometry = new THREE.RingGeometry(0.5, 0.7, 32);
            const material = new THREE.MeshPhongMaterial({
                color: 0x3EE0B1,
                emissive: 0x3EE0B1,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.3
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = -Math.PI / 2;
            
            // Position rings randomly on the ground
            ring.position.x = (Math.random() - 0.5) * 80;
            ring.position.z = (Math.random() - 0.5) * 80;
            ring.position.y = 0.01; // Slightly above ground
            
            this.scene.add(ring);
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

        // Clear the entire scene
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object !== this.scene) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Reset scene properties
        this.scene.background = new THREE.Color(0xFFFFFF);
        this.scene.fog = new THREE.FogExp2(0xFFFFFF, 0.01);

        // Recreate all lights
        this.setupLights();

        // Recreate the entire environment
        this.createBasicScene(); // This includes ground, grid, and coffee shop environment

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
            hasEnvironment: true
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

    createParticleEffect(position, color, count = 10, options = {}) {
        const {
            scale = 0.1,
            lifetime = 1.0,
            velocityScale = 2,
            verticalForce = 1,
            emissive = false
        } = options;

        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(scale, 8, 8),
                new THREE.MeshPhongMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.8,
                    emissive: emissive ? color : undefined,
                    emissiveIntensity: emissive ? 0.5 : 0
                })
            );

            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * velocityScale,
                Math.random() * verticalForce,
                (Math.random() - 0.5) * velocityScale
            );
            particle.lifetime = lifetime;
            particle.initialScale = scale;
            this.particles.push(particle);
            this.scene.add(particle);
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.lifetime -= deltaTime;

            if (particle.lifetime <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
                continue;
            }

            // Update position with more dynamic movement
            particle.velocity.y -= deltaTime * 2; // Gravity effect
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // Fade out with smooth curve
            particle.material.opacity = (particle.lifetime * particle.lifetime) * 0.8;
            
            // Scale down over lifetime
            const scale = particle.initialScale * (0.5 + particle.lifetime * 0.5);
            particle.scale.set(scale, scale, scale);
            
            // Add subtle rotation
            particle.rotation.x += deltaTime * (Math.random() - 0.5);
            particle.rotation.z += deltaTime * (Math.random() - 0.5);
            
            // Slow down with air resistance
            particle.velocity.multiplyScalar(0.98);
        }
    }

    createSnakeTrail() {
        if (!this.snake || !this.snake.head) return;

        const trail = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshPhongMaterial({
                color: 0x3EE0B1,
                transparent: true,
                opacity: 0.5
            })
        );

        trail.position.copy(this.snake.head.position);
        trail.lifetime = 0.5; // Trail particles last 0.5 seconds
        this.snakeTrail.push(trail);
        this.scene.add(trail);
    }

    updateSnakeTrail(deltaTime) {
        // Update existing trail particles
        for (let i = this.snakeTrail.length - 1; i >= 0; i--) {
            const trail = this.snakeTrail[i];
            trail.lifetime -= deltaTime;

            if (trail.lifetime <= 0) {
                this.scene.remove(trail);
                this.snakeTrail.splice(i, 1);
                continue;
            }

            // Fade out
            trail.material.opacity = trail.lifetime;
            
            // Shrink slightly
            trail.scale.multiplyScalar(0.95);
        }
    }

    updateDayNightCycle(deltaTime) {
        this.dayNightCycle += deltaTime * 0.05; // Slower cycle - now takes 120 seconds
        const cyclePosition = (Math.sin(this.dayNightCycle) + 1) / 2; // 0 to 1

        // Morning colors (warm)
        const morningColor = new THREE.Color(0xFFE4B5);
        // Noon colors (bright white)
        const noonColor = new THREE.Color(0xFFFFFF);
        // Evening colors (warm orange)
        const eveningColor = new THREE.Color(0xFFA07A);
        // Night colors (cool blue)
        const nightColor = new THREE.Color(0x4A6F8A);

        let currentColor;
        if (cyclePosition < 0.25) { // Dawn to morning
            currentColor = morningColor.lerp(noonColor, cyclePosition * 4);
        } else if (cyclePosition < 0.5) { // Morning to noon
            currentColor = noonColor;
        } else if (cyclePosition < 0.75) { // Noon to evening
            currentColor = noonColor.lerp(eveningColor, (cyclePosition - 0.5) * 4);
        } else { // Evening to night
            currentColor = eveningColor.lerp(nightColor, (cyclePosition - 0.75) * 4);
        }

        // Update lights with new colors
        this.ambientLight.color = currentColor;
        this.ambientLight.intensity = 0.2 + cyclePosition * 0.4;

        this.directionalLight.color = currentColor;
        this.directionalLight.intensity = 0.4 + cyclePosition * 0.6;

        this.hemisphereLight.color = currentColor;
        this.hemisphereLight.groundColor = nightColor;
        this.hemisphereLight.intensity = 0.2 + cyclePosition * 0.4;

        // Update fog
        this.scene.fog.color = currentColor;
        this.scene.fog.density = 0.01 + (1 - cyclePosition) * 0.02;

        // Update giant coffee cup steam based on time of day
        this.scene.traverse((object) => {
            if (object.material && object.material.opacity < 0.5) { // Likely steam particle
                object.material.opacity = 0.1 + cyclePosition * 0.3;
            }
        });
    }

    onSnakeTurn(position) {
        this.createParticleEffect(position, 0x3EE0B1, 8, {
            scale: 0.15,
            lifetime: 0.6,
            velocityScale: 1,
            verticalForce: 0.5
        });
        this.audioManager.play('turn');
    }

    onGameOver(position) {
        // Create a dramatic explosion effect
        this.createParticleEffect(position, 0xE179DA, 40, {
            scale: 0.2,
            lifetime: 2.0,
            velocityScale: 4,
            verticalForce: 3,
            emissive: true
        });
        this.audioManager.play('gameOver');
    }

    onSpeedBoost(position) {
        this.createParticleEffect(position, 0xFAA70D, 20, {
            scale: 0.15,
            lifetime: 0.8,
            velocityScale: 3,
            verticalForce: 1,
            emissive: true
        });
        this.audioManager.play('powerUp');
    }

    addAmbientParticles() {
        // Add floating dust particles in the coffee shop
        for (let i = 0; i < 100; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshPhongMaterial({
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.2
                })
            );

            // Position randomly in the coffee shop area
            particle.position.set(
                (Math.random() - 0.5) * 160,
                1 + Math.random() * 6,
                (Math.random() - 0.5) * 160
            );

            particle.userData.initialY = particle.position.y;
            particle.userData.floatSpeed = 0.2 + Math.random() * 0.3;
            particle.userData.floatOffset = Math.random() * Math.PI * 2;
            particle.userData.driftSpeed = {
                x: (Math.random() - 0.5) * 0.2,
                z: (Math.random() - 0.5) * 0.2
            };

            this.scene.add(particle);
        }
    }
} 
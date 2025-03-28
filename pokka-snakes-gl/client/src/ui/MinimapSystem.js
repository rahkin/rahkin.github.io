export class MinimapSystem {
    constructor(game, size = 200) {
        this.game = game;
        this.size = size;
        this.scale = 0.1; // Scale factor for minimap
        
        this.setupMinimap();
        this.setupRenderer();
        this.createMinimapCamera();
        this.setupEventListeners();
    }

    setupMinimap() {
        // Create minimap container
        this.container = document.createElement('div');
        this.container.className = 'minimap-container';
        
        // Create canvas for minimap
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.container.appendChild(this.canvas);

        // Create overlay elements
        this.overlay = document.createElement('div');
        this.overlay.className = 'minimap-overlay';
        this.container.appendChild(this.overlay);

        // Add legend
        this.legend = document.createElement('div');
        this.legend.className = 'minimap-legend';
        this.legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: #00ff00;"></span>
                <span class="legend-text">Player</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ff0000;"></span>
                <span class="legend-text">Enemies</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ffff00;"></span>
                <span class="legend-text">Power-ups</span>
            </div>
        `;
        this.container.appendChild(this.legend);

        document.body.appendChild(this.container);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setClearColor(0x000000, 0.3);
    }

    createMinimapCamera() {
        const aspect = this.size / this.size;
        this.camera = new THREE.OrthographicCamera(
            -100 * aspect,
            100 * aspect,
            100,
            -100,
            1,
            1000
        );
        this.camera.position.set(0, 200, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 0, -1);
    }

    setupEventListeners() {
        // Make minimap draggable
        let isDragging = false;
        let startX, startY;

        this.container.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - this.container.offsetLeft;
            startY = e.clientY - this.container.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - startX;
            const y = e.clientY - startY;
            
            this.container.style.left = `${x}px`;
            this.container.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Add zoom controls
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale = Math.max(0.05, Math.min(0.2, this.scale + e.deltaY * -0.0001));
            this.updateCameraZoom();
        });

        // Toggle legend
        this.container.addEventListener('dblclick', () => {
            this.legend.classList.toggle('hidden');
        });
    }

    updateCameraZoom() {
        const aspect = this.size / this.size;
        const zoom = 100 / this.scale;
        this.camera.left = -zoom * aspect;
        this.camera.right = zoom * aspect;
        this.camera.top = zoom;
        this.camera.bottom = -zoom;
        this.camera.updateProjectionMatrix();
    }

    createMinimapScene() {
        this.minimapScene = new THREE.Scene();

        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.5
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.minimapScene.add(ground);

        // Add grid
        const grid = new THREE.GridHelper(200, 20, 0x222222, 0x222222);
        grid.rotation.x = Math.PI / 2;
        this.minimapScene.add(grid);
    }

    createEntityMarker(entity) {
        let color;
        let size = 2;

        switch(entity.type) {
            case 'player':
                color = 0x00ff00;
                size = 3;
                break;
            case 'enemy':
                color = 0xff0000;
                break;
            case 'powerUp':
                color = 0xffff00;
                break;
            default:
                color = 0xffffff;
        }

        const geometry = new THREE.CircleGeometry(size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.rotation.x = -Math.PI / 2;
        marker.userData.entity = entity;

        return marker;
    }

    updateEntityMarkers() {
        // Clear existing markers
        this.minimapScene.children.forEach(child => {
            if (child.userData.entity) {
                this.minimapScene.remove(child);
            }
        });

        // Add new markers for all entities
        this.game.entities.forEach(entity => {
            if (entity.position) {
                const marker = this.createEntityMarker(entity);
                marker.position.copy(entity.position);
                marker.position.y = 0.1;
                this.minimapScene.add(marker);
            }
        });
    }

    update() {
        // Update entity positions
        this.updateEntityMarkers();

        // Update camera position to follow player
        if (this.game.player) {
            const playerPos = this.game.player.position;
            this.camera.position.set(playerPos.x, 200, playerPos.z);
            this.camera.lookAt(playerPos.x, 0, playerPos.z);
        }

        // Render minimap
        this.renderer.render(this.minimapScene, this.camera);
    }

    resize(width, height) {
        // Maintain aspect ratio
        const size = Math.min(width * 0.2, height * 0.2);
        this.size = size;
        this.canvas.width = size;
        this.canvas.height = size;
        this.renderer.setSize(size, size);
        this.updateCameraZoom();
    }

    toggle() {
        this.container.classList.toggle('hidden');
    }
} 
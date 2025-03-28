import * as THREE from 'three';

export class Grid {
    constructor(scene, width = 30, height = 30) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        
        this.createBackground();
        this.createGrid();
        this.createBoundaries();
        this.addLighting();
    }

    createBackground() {
        // Create starfield background
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = -50;

            colors[i * 3] = Math.random();
            colors[i * 3 + 1] = Math.random();
            colors[i * 3 + 2] = Math.random();
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true
        });

        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }

    createGrid() {
        // Create enhanced grid
        const gridGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const gridMaterial = new THREE.MeshPhongMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });

        this.gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        this.scene.add(this.gridMesh);

        // Add grid lines
        const linesMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2
        });

        const linesGeometry = new THREE.BufferGeometry();
        const points = [];

        // Create vertical lines
        for (let x = -this.width/2; x <= this.width/2; x++) {
            points.push(new THREE.Vector3(x, -this.height/2, 0));
            points.push(new THREE.Vector3(x, this.height/2, 0));
        }

        // Create horizontal lines
        for (let y = -this.height/2; y <= this.height/2; y++) {
            points.push(new THREE.Vector3(-this.width/2, y, 0));
            points.push(new THREE.Vector3(this.width/2, y, 0));
        }

        linesGeometry.setFromPoints(points);
        this.gridLines = new THREE.LineSegments(linesGeometry, linesMaterial);
        this.scene.add(this.gridLines);
    }

    createBoundaries() {
        const wallGeometry = new THREE.BoxGeometry(1, 1, 2);
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.5,
            emissive: 0x0044aa
        });
        
        // Create walls with glow effect
        const walls = [
            { pos: [0, this.height/2, 0], scale: [this.width, 1, 1] },
            { pos: [0, -this.height/2, 0], scale: [this.width, 1, 1] },
            { pos: [-this.width/2, 0, 0], scale: [1, this.height, 1] },
            { pos: [this.width/2, 0, 0], scale: [1, this.height, 1] }
        ];

        walls.forEach(wall => {
            const mesh = new THREE.Mesh(wallGeometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.scale.set(...wall.scale);
            this.scene.add(mesh);
        });
    }

    addLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);

        // Add directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        // Add point lights near corners
        const pointLightColor = 0x0088ff;
        const pointLightIntensity = 0.5;
        const cornerLights = [
            { pos: [this.width/2, this.height/2, 2] },
            { pos: [-this.width/2, this.height/2, 2] },
            { pos: [this.width/2, -this.height/2, 2] },
            { pos: [-this.width/2, -this.height/2, 2] }
        ];

        cornerLights.forEach(light => {
            const pointLight = new THREE.PointLight(pointLightColor, pointLightIntensity);
            pointLight.position.set(...light.pos);
            this.scene.add(pointLight);
        });
    }

    update() {
        // Rotate starfield slowly
        if (this.starfield) {
            this.starfield.rotation.z += 0.0001;
        }
    }

    isInBounds(position) {
        // Add small buffer to prevent immediate collision
        const buffer = 0.5;
        return (
            position.x > -this.width/2 + buffer && 
            position.x < this.width/2 - buffer &&
            position.y > -this.height/2 + buffer && 
            position.y < this.height/2 - buffer
        );
    }

    getRandomPosition() {
        // Keep pellets away from edges
        const buffer = 2;
        return new THREE.Vector3(
            (Math.random() * (this.width - buffer * 2) - (this.width/2 - buffer)),
            (Math.random() * (this.height - buffer * 2) - (this.height/2 - buffer)),
            0
        );
    }
} 
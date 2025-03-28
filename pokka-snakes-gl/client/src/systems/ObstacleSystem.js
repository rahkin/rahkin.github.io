import * as THREE from 'three';

export class ObstacleSystem {
    constructor(game) {
        this.game = game;
        this.obstacles = new Set();
        this.patterns = this.createPatterns();
        this.currentDifficulty = 1;
    }

    createPatterns() {
        return {
            wall: {
                create: (position) => this.createWall(position),
                spacing: 4
            },
            spinner: {
                create: (position) => this.createSpinner(position),
                spacing: 6
            },
            moving: {
                create: (position) => this.createMovingObstacle(position),
                spacing: 5
            }
        };
    }

    initialize() {
        this.createInitialObstacles();
    }

    createInitialObstacles() {
        // Create border walls with larger size and safe zone
        const size = 45;
        const safeZoneSize = 10; // Create a safe zone around spawn point

        for (let x = -size; x <= size; x += 4) {
            // Only create walls outside the safe zone
            if (Math.abs(x) > safeZoneSize) {
                this.createWall(new THREE.Vector3(x, 0, -size));
                this.createWall(new THREE.Vector3(x, 0, size));
            }
        }

        for (let z = -size; z <= size; z += 4) {
            if (Math.abs(z) > safeZoneSize) {
                this.createWall(new THREE.Vector3(-size, 0, z));
                this.createWall(new THREE.Vector3(size, 0, z));
            }
        }

        // Add random obstacles away from spawn point
        for (let i = 0; i < 5; i++) {
            this.createRandomObstacleWithSafeZone(safeZoneSize);
        }
    }

    createWall(position) {
        const geometry = new THREE.BoxGeometry(2, 4, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(position);
        wall.position.y = 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        this.game.scene.add(wall);
        this.obstacles.add({
            mesh: wall,
            type: 'wall',
            update: null
        });
    }

    createSpinner(position) {
        const geometry = new THREE.BoxGeometry(6, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const spinner = new THREE.Mesh(geometry, material);
        spinner.position.copy(position);
        spinner.position.y = 2;
        spinner.castShadow = true;
        
        this.game.scene.add(spinner);
        this.obstacles.add({
            mesh: spinner,
            type: 'spinner',
            update: (deltaTime) => {
                spinner.rotation.y += deltaTime * 2;
            }
        });
    }

    createMovingObstacle(position) {
        const geometry = new THREE.SphereGeometry(1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.copy(position);
        obstacle.position.y = 1;
        obstacle.castShadow = true;
        
        const startPos = position.clone();
        let time = 0;
        
        this.game.scene.add(obstacle);
        this.obstacles.add({
            mesh: obstacle,
            type: 'moving',
            update: (deltaTime) => {
                time += deltaTime;
                obstacle.position.x = startPos.x + Math.sin(time) * 4;
                obstacle.position.z = startPos.z + Math.cos(time) * 4;
            }
        });
    }

    createRandomObstacleWithSafeZone(safeZoneSize) {
        const types = Object.keys(this.patterns);
        const type = types[Math.floor(Math.random() * types.length)];
        const pattern = this.patterns[type];
        
        // Generate position outside safe zone
        let position;
        do {
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 80,
                0,
                (Math.random() - 0.5) * 80
            );
        } while (
            Math.abs(position.x) < safeZoneSize && 
            Math.abs(position.z) < safeZoneSize
        );
        
        pattern.create(position);
    }

    update(deltaTime) {
        this.obstacles.forEach(obstacle => {
            if (obstacle.update) {
                obstacle.update(deltaTime);
            }
        });
    }

    checkCollisions(snake) {
        if (snake.isInvulnerable) return false;

        const headBoundingBox = new THREE.Box3()
            .setFromObject(snake.head);
        
        for (const obstacle of this.obstacles) {
            const obstacleBoundingBox = new THREE.Box3()
                .setFromObject(obstacle.mesh);
            
            if (headBoundingBox.intersectsBox(obstacleBoundingBox)) {
                return true;
            }
        }
        
        return false;
    }

    increaseDifficulty(deltaTime) {
        this.currentDifficulty += deltaTime * 0.01;
        
        // Add new obstacles based on difficulty
        if (Math.random() < 0.001 * this.currentDifficulty) {
            this.createRandomObstacleWithSafeZone(10);
        }
    }

    reset() {
        this.obstacles.forEach(obstacle => {
            this.game.scene.remove(obstacle.mesh);
            if (obstacle.mesh.geometry) obstacle.mesh.geometry.dispose();
            if (obstacle.mesh.material) obstacle.mesh.material.dispose();
        });
        
        this.obstacles.clear();
        this.currentDifficulty = 1;
        this.createInitialObstacles();
    }

    cleanup() {
        this.reset();
    }
} 
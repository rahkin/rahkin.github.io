import * as THREE from 'three';

export class ObstacleSystem {
    constructor(game) {
        this.game = game;
        this.obstacles = new Set();
        this.patterns = this.createPatterns();
        this.currentDifficulty = 1;
    }

    start() {
        console.log('ObstacleSystem: Starting');
        // Reset any existing obstacles
        this.cleanup();
        // Initialize obstacles
        this.initialize();
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
        const obstacle = {
            mesh: wall,
            type: 'wall',
            position: wall.position.clone(),
            radius: 1.5, // Adjusted collision radius for better detection
            update: null
        };
        this.obstacles.add(obstacle);
        console.log('ObstacleSystem: Created wall obstacle', {
            position: obstacle.position.clone(),
            radius: obstacle.radius,
            size: new THREE.Vector3(2, 4, 2)
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
        const obstacle = {
            mesh: spinner,
            type: 'spinner',
            position: spinner.position.clone(),
            radius: 4.0, // Increased spinner collision radius
            update: (deltaTime) => {
                spinner.rotation.y += deltaTime * 2;
                // Update position for collision detection
                obstacle.position.copy(spinner.position);
            }
        };
        this.obstacles.add(obstacle);
        console.log('ObstacleSystem: Created spinner obstacle', {
            position: obstacle.position.clone(),
            radius: obstacle.radius
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
        const obstacleData = {
            mesh: obstacle,
            type: 'moving',
            isMoving: true, // Explicitly mark as moving obstacle
            position: obstacle.position.clone(),
            radius: 1.5,
            update: (deltaTime) => {
                time += deltaTime;
                obstacle.position.x = startPos.x + Math.sin(time) * 4;
                obstacle.position.z = startPos.z + Math.cos(time) * 4;
                // Update position for collision detection
                obstacleData.position.copy(obstacle.position);
            }
        };
        this.obstacles.add(obstacleData);
        console.log('ObstacleSystem: Created moving obstacle', {
            position: obstacleData.position.clone(),
            radius: obstacleData.radius,
            isMoving: obstacleData.isMoving
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
        // Update obstacle positions and animations
        this.obstacles.forEach(obstacle => {
            if (obstacle.update) {
                obstacle.update(deltaTime);
            }
        });
    }

    checkCollisions(target) {
        // Handle both snake objects and direct positions with radius
        let position, radius = 0.8; // Default radius if not specified

        if (target instanceof THREE.Vector3) {
            position = target;
        } else if (target && target.position) {
            position = target.position;
            radius = target.radius || radius;
        } else if (target && target.head) {
            if (target.isInvulnerable || target.isGhost) return false;
            position = target.head.position;
            radius = target.collisionRadius || radius;
        } else {
            console.error('ObstacleSystem: Invalid target for collision check');
            return false;
        }

        for (const obstacle of this.obstacles) {
            if (!obstacle || !obstacle.position) continue;

            // Adjust collision radius based on obstacle type
            let effectiveRadius = obstacle.radius;
            if (obstacle.type === 'moving' || obstacle.isMoving) {
                effectiveRadius *= 0.6; // Reduce collision radius for moving obstacles
            }

            const distance = position.distanceTo(obstacle.position);
            const minDistance = radius + effectiveRadius;

            if (distance < minDistance) {
                console.log('ObstacleSystem: Collision detected', {
                    distance,
                    minDistance,
                    targetPosition: position.clone(),
                    targetRadius: radius,
                    obstaclePosition: obstacle.position.clone(),
                    obstacleRadius: effectiveRadius,
                    originalRadius: obstacle.radius,
                    obstacleType: obstacle.type,
                    isMoving: obstacle.isMoving,
                    obstacleCount: this.obstacles.size
                });
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

    isNearMovingObstacle(position) {
        if (!position || !this.obstacles) return false;

        // Check each obstacle
        for (const obstacle of this.obstacles) {
            // Skip if not a moving obstacle
            if (!obstacle.type === 'moving' && !obstacle.isMoving) continue;

            // Calculate distance to moving obstacle
            const distance = position.distanceTo(obstacle.position);
            
            // Consider "near" if within 4 units
            if (distance < 4) {
                console.log('ObstacleSystem: Near moving obstacle', {
                    distance,
                    position: position.clone(),
                    obstaclePosition: obstacle.position.clone(),
                    obstacleType: obstacle.type
                });
                return true;
            }
        }

        return false;
    }
} 
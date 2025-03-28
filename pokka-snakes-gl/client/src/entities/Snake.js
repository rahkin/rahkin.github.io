import * as THREE from 'three';

export class Snake {
    constructor(game, position) {
        this.game = game;
        this.position = position || new THREE.Vector3(0, 0.5, 0);
        this.direction = new THREE.Vector3(0, 0, 1); // Start moving forward
        this.speed = 10;
        this.segments = [];
        this.group = new THREE.Group();
        this.segmentSpacing = 1.05; // Reduced segment spacing
        this.worldSize = 50; // Half the world size
        this.margin = 1; // Margin to prevent getting stuck in walls
        this.isInvulnerable = false; // Add invulnerability property
        
        // Create snake head
        this.createHead();
        
        // Add initial segments with proper spacing
        for (let i = 0; i < 3; i++) {
            this.addSegment();
        }
        
        // Log initial state
        console.log('Snake: Initialized', {
            position: this.position.clone(),
            headPosition: this.head.position.clone(),
            segments: this.segments.map((s, i) => ({
                index: i,
                position: s.position.clone(),
                distanceToNext: i < this.segments.length - 1 ? 
                    s.position.distanceTo(this.segments[i + 1].position) : null
            }))
        });
    }

    createHead() {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        
        this.head = new THREE.Mesh(geometry, material);
        this.head.position.copy(this.position); // Ensure head is at snake's position
        this.head.castShadow = true;
        this.head.receiveShadow = true;
        
        this.group.add(this.head);
        this.segments.push(this.head);
    }

    addSegment() {
        // Calculate new segment position based on the last segment's position
        const lastSegment = this.segments[this.segments.length - 1];
        const newPosition = lastSegment.position.clone().sub(
            this.direction.clone().multiplyScalar(this.segmentSpacing)
        );

        // Create new segment
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.position.copy(newPosition);
        segment.castShadow = true;
        segment.receiveShadow = true;

        this.segments.push(segment);
        this.group.add(segment);

        // Log segment addition with more detailed position info
        console.log('Snake: Added segment', {
            index: this.segments.length - 1,
            position: newPosition.clone(),
            headPosition: this.head.position.clone(),
            direction: this.direction.clone(),
            spacing: this.segmentSpacing
        });
    }

    setDirection(direction) {
        // Prevent 180-degree turns
        if (direction.dot(this.direction) === -1) return;
        this.direction = direction;
    }

    update(deltaTime) {
        // Update head position first
        const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(movement);
        this.head.position.copy(this.position);

        // Update each segment to follow the one in front of it
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const target = this.segments[i - 1];
            
            // Calculate vector from segment to target
            const toTarget = target.position.clone().sub(segment.position);
            const distance = toTarget.length();
            
            if (distance > this.segmentSpacing) {
                // If too far, move towards target
                toTarget.normalize();
                const moveAmount = Math.min(
                    this.speed * deltaTime,
                    distance - this.segmentSpacing
                );
                segment.position.add(toTarget.multiplyScalar(moveAmount));
            }
        }

        // Log segment positions periodically
        if (Math.random() < 0.01) {
            console.log('Snake: Current segment positions', {
                head: this.head.position.clone(),
                segments: this.segments.map((s, i) => ({
                    index: i,
                    position: s.position.clone(),
                    distanceToNext: i < this.segments.length - 1 ? 
                        s.position.distanceTo(this.segments[i + 1].position) : null
                }))
            });
        }

        // Check for collisions with pellets
        this.checkPelletCollisions();
    }

    checkPelletCollisions() {
        if (!this.game.gameManager || !this.game.gameManager.pellets) return;

        for (let i = this.game.gameManager.pellets.length - 1; i >= 0; i--) {
            const pellet = this.game.gameManager.pellets[i];
            if (!pellet || !pellet.position) continue;

            const distance = this.head.position.distanceTo(pellet.position);
            const collisionThreshold = 1.2; // Increased threshold for pellet collection

            if (distance < collisionThreshold) {
                console.log('Snake: Pellet collision detected', {
                    distance,
                    threshold: collisionThreshold,
                    pelletType: pellet.type,
                    headPosition: this.head.position.clone(),
                    pelletPosition: pellet.position.clone()
                });
                this.game.gameManager.collectPellet(pellet);
            }
        }
    }

    checkWallCollision() {
        // Check if snake is in ghost mode
        const isGhostMode = this.game.powerUpSystem && 
            this.game.powerUpSystem.isPowerUpActive('ghost');

        // If in ghost mode, allow passing through walls
        if (isGhostMode) return false;

        // Check boundaries with increased margin
        const margin = 2.0; // Increased margin to prevent getting stuck
        const xCollision = Math.abs(this.position.x) > this.worldSize - margin;
        const zCollision = Math.abs(this.position.z) > this.worldSize - margin;

        if (xCollision || zCollision) {
            console.log('Snake: Wall collision detected', {
                position: this.position.clone(),
                xCollision,
                zCollision,
                worldSize: this.worldSize,
                margin: margin,
                direction: this.direction.clone()
            });
            return true;
        }

        return false;
    }

    checkObstacleCollision() {
        if (!this.obstacleSystem) {
            console.log('Snake: No obstacle system found');
            return false;
        }

        const hasCollision = this.obstacleSystem.checkCollisions(this);
        if (hasCollision) {
            console.log('Snake: Obstacle collision detected', {
                headPosition: this.head.position.clone(),
                direction: this.direction.clone(),
                obstacleSystem: !!this.obstacleSystem
            });
        }
        return hasCollision;
    }

    checkSelfCollision() {
        // Check if snake has shield power-up
        const hasShield = this.game.powerUpSystem && 
            this.game.powerUpSystem.isPowerUpActive('shield');

        // If shield is active, no self-collision
        if (hasShield) return false;

        // Don't check self-collision if snake is too short
        if (this.segments.length < 4) return false;

        // Check collision with segments, starting from further back
        for (let i = 4; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const distance = this.head.position.distanceTo(segment.position);

            // Only consider it a collision if the distance is less than the segment spacing
            if (distance < this.segmentSpacing * 0.7) { // Reduced collision threshold
                console.log('Snake: Self collision detected', {
                    segmentIndex: i,
                    distance,
                    threshold: this.segmentSpacing * 0.7,
                    headPosition: this.head.position.clone(),
                    segmentPosition: segment.position.clone(),
                    direction: this.direction.clone(),
                    totalSegments: this.segments.length,
                    segmentSpacing: this.segmentSpacing,
                    distances: this.segments.map((s, idx) => ({
                        index: idx,
                        distance: this.head.position.distanceTo(s.position)
                    }))
                });
                return true;
            }
        }

        return false;
    }

    cleanup() {
        // Remove all segments from scene
        this.segments.forEach(segment => {
            this.group.remove(segment);
            segment.geometry.dispose();
            segment.material.dispose();
        });
        this.segments = [];

        // Remove group from scene and dispose of it
        this.game.scene.remove(this.group);
        this.group = new THREE.Group(); // Create a new group for the next instance
    }
} 
import * as THREE from 'three';

export class Snake {
    constructor(game, startPosition) {
        this.game = game;
        this.speed = 15;
        this.direction = new THREE.Vector3(1, 0, 0);
        this.nextDirection = this.direction.clone();
        this.segments = [];
        this.segmentSpacing = 1.67;
        this.isGhost = false;
        this.isInvincible = false;
        this.pointMultiplier = 1;
        this.hasRainbowTrail = false;
        this.hasMagnet = false;
        this.worldSize = 100;
        this.initialized = false;
        this.initializationFrames = 180;
        this.movementEnabled = false;
        this.collisionChecksEnabled = false;
        
        // Create snake group
        this.group = new THREE.Group();
        this.game.scene.add(this.group);
        
        // Create head
        this.createHead(startPosition);
        
        // Add initial segments with proper spacing
        for (let i = 0; i < 5; i++) {
            const segmentPos = startPosition.clone().sub(
                this.direction.clone().multiplyScalar(this.segmentSpacing * (i + 1))
            );
            this.addSegmentAtPosition(segmentPos);
        }
        
        // Initialize position history for smooth movement
        this.positionHistory = [];
        for (let i = 0; i < 10; i++) {
            this.positionHistory.push(startPosition.clone());
        }

        // Add trail effect
        this.createTrail();
        
        // Set up input handling
        this.setupInput();
        
        // Log initialization details
        console.log('Snake: Initialized', {
            headPosition: this.head.position.clone(),
            segmentSpacing: this.segmentSpacing,
            initialSegments: this.segments.length,
            segmentPositions: this.segments.map(s => s.position.clone()),
            frameCount: this.game.frameCount
        });
        
        // Enable movement after longer initialization delay
        setTimeout(() => {
            this.movementEnabled = true;
            console.log('Snake: Movement enabled', {
                frameCount: this.game.frameCount,
                headPosition: this.head.position.clone(),
                segmentPositions: this.segments.map(s => s.position.clone())
            });
        }, 4000);
    }

    createHead(startPosition) {
        const headGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        this.material = new THREE.MeshPhongMaterial({
            color: 0x3EE0B1,
            emissive: 0x3EE0B1,
            emissiveIntensity: 0.4,
            shininess: 50,
            transparent: true,
            opacity: 0.9
        });

        // Create glow effect for head
        const glowGeometry = new THREE.SphereGeometry(1.0, 32, 32);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: 0x3EE0B1,
            emissive: 0x3EE0B1,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });

        this.head = new THREE.Mesh(headGeometry, this.material);
        this.headGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        
        this.head.position.copy(startPosition);
        this.headGlow.position.copy(startPosition);
        
        this.collisionRadius = 0.9;
        this.group.add(this.head);
        this.group.add(this.headGlow);
    }

    createTrail() {
        // Create trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const trailPoints = [];
        const trailColors = [];
        
        // Create initial trail points
        for (let i = 0; i < 50; i++) {
            trailPoints.push(0, 0, 0);
            trailColors.push(0.24, 0.88, 0.69); // Mint color (0x3EE0B1)
        }
        
        trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPoints, 3));
        trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(trailColors, 3));
        
        const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            linewidth: 1
        });
        
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.game.scene.add(this.trail);
        
        // Store trail points for updating
        this.trailPoints = [];
        for (let i = 0; i < 50; i++) {
            this.trailPoints.push(this.head.position.clone());
        }
    }

    updateTrail() {
        // Update trail points
        this.trailPoints.push(this.head.position.clone());
        this.trailPoints.shift();
        
        // Update trail geometry
        const positions = this.trail.geometry.attributes.position.array;
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        }
        
        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    addSegmentAtPosition(position) {
        const geometry = new THREE.SphereGeometry(0.7, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3EE0B1, // Pokka's mint color
            emissive: 0x3EE0B1,
            emissiveIntensity: 0.2
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.position.copy(position);
        segment.castShadow = true;
        segment.receiveShadow = true;

        this.segments.push(segment);
        this.group.add(segment);

        console.log('Snake: Added segment', {
            index: this.segments.length - 1,
            position: position.clone(),
            headPosition: this.head.position.clone(),
            direction: this.direction.clone(),
            spacing: this.segmentSpacing
        });
    }

    addSegment() {
        // Calculate new segment position based on the last segment or head
        let newPosition;
        if (this.segments.length === 0) {
            // If this is the first segment, position it behind the head
            newPosition = this.head.position.clone().sub(
                this.direction.clone().multiplyScalar(this.segmentSpacing)
            );
        } else {
            // For subsequent segments, position behind the last segment
            const lastSegment = this.segments[this.segments.length - 1];
            newPosition = lastSegment.position.clone().sub(
                this.direction.clone().multiplyScalar(this.segmentSpacing)
            );
        }

        this.addSegmentAtPosition(newPosition);
    }

    setGhostMode(enabled) {
        this.isGhost = enabled;
        
        // Update visual appearance
        const opacity = enabled ? 0.5 : 1.0;
        const emissiveIntensity = enabled ? 0.8 : 0.2;
        
        // Update head material
        this.head.material.transparent = enabled;
        this.head.material.opacity = opacity;
        this.head.material.emissiveIntensity = emissiveIntensity;
        
        // Update segment materials
        this.segments.forEach(segment => {
            segment.material.transparent = enabled;
            segment.material.opacity = opacity;
            segment.material.emissiveIntensity = emissiveIntensity;
        });
        
        // Add ghost trail effect if enabled
        if (enabled) {
            this.addGhostTrail();
        } else {
            this.removeGhostTrail();
        }
    }

    addGhostTrail() {
        // Create ghost trail effect
        const trailGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const trailMaterial = new THREE.MeshPhongMaterial({
            color: 0x3EE0B1, // Pokka's mint color
            transparent: true,
            opacity: 0.3,
            emissive: 0x3EE0B1,
            emissiveIntensity: 0.3
        });
        
        this.ghostTrails = [];
        for (let i = 0; i < 5; i++) {
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.copy(this.head.position);
            this.game.scene.add(trail);
            this.ghostTrails.push(trail);
        }
    }

    removeGhostTrail() {
        if (this.ghostTrails) {
            this.ghostTrails.forEach(trail => {
                this.game.scene.remove(trail);
                trail.geometry.dispose();
                trail.material.dispose();
            });
            this.ghostTrails = null;
        }
    }

    setDirection(direction) {
        // Clone the input direction to prevent reference issues
        const newDirection = direction.clone();
        
        // Prevent 180-degree turns by checking dot product with current direction
        if (this.direction.dot(newDirection) === -1) {
            console.log('Snake: Prevented 180-degree turn', {
                currentDirection: this.direction.clone(),
                attemptedDirection: newDirection.clone()
            });
            return;
        }

        // Store the next direction - will be applied on next update
        this.nextDirection = newDirection;
        
        // Trigger turn sound and effect
        if (this.game && this.head) {
            this.game.onSnakeTurn(this.head.position);
        }
        
        console.log('Snake: Direction changed', {
            oldDirection: this.direction.clone(),
            newDirection: this.nextDirection.clone(),
            headPosition: this.head ? this.head.position.clone() : null
        });
    }

    checkObstacleCollision() {
        if (!this.game.gameManager.obstacleSystem) return false;
        
        const headPos = this.head.position;
        const isNearMovingObstacle = this.game.gameManager.obstacleSystem.isNearMovingObstacle(headPos);
        
        // Use a more forgiving radius for moving obstacles
        const collisionRadius = isNearMovingObstacle ? 
            this.collisionRadius * 0.4 : // Increased for rectangular obstacles
            this.collisionRadius * 0.6;  // Normal radius for static obstacles

        // Check for collisions using the obstacle system's checkCollisions method
        const collision = this.game.gameManager.obstacleSystem.checkCollisions({
            position: headPos,
            radius: collisionRadius,
            isRectangular: isNearMovingObstacle // Add flag to indicate rectangular obstacle
        });

        if (collision) {
            // For precise collision detection with rectangular obstacles
            const preciseRadius = isNearMovingObstacle ? 
                this.collisionRadius * 0.3 : // Adjusted for rectangular obstacles
                this.collisionRadius * 0.5;  // Normal precise check for static

            const preciseCollision = this.game.gameManager.obstacleSystem.checkCollisions({
                position: headPos,
                radius: preciseRadius,
                isRectangular: isNearMovingObstacle // Add flag to indicate rectangular obstacle
            });

            if (preciseCollision) {
                console.log('Snake: Obstacle collision detected', {
                    distance: headPos.distanceTo(this.game.gameManager.obstacleSystem.getNearestObstacle(headPos).position),
                    preciseRadius,
                    isMovingObstacle: isNearMovingObstacle,
                    isRectangular: true,
                    obstaclePosition: this.game.gameManager.obstacleSystem.getNearestObstacle(headPos).position.clone(),
                    headPosition: headPos.clone()
                });
                return true;
            }
        }
        return false;
    }

    update(deltaTime) {
        if (!this.game.isRunning || this.game.gameManager.isGameOver || !this.movementEnabled) {
            return;
        }

        // Update trail
        this.updateTrail();

        // Update head glow
        if (this.headGlow) {
            this.headGlow.position.copy(this.head.position);
            // Add subtle animation to glow
            const glowScale = 1 + Math.sin(performance.now() * 0.003) * 0.1;
            this.headGlow.scale.set(glowScale, glowScale, glowScale);
        }

        // Set initialized flag after more frames
        if (!this.initialized && this.game.frameCount > this.initializationFrames) {
            this.initialized = true;
            this.collisionChecksEnabled = true;
            console.log('Snake: Initialization complete', {
                frameCount: this.game.frameCount,
                headPosition: this.head.position.clone(),
                segmentPositions: this.segments.map(s => s.position.clone()),
                collisionChecksEnabled: this.collisionChecksEnabled
            });
        }

        // Update direction from stored next direction
        if (this.nextDirection) {
            const oldDirection = this.direction.clone();
            this.direction.copy(this.nextDirection);
            
            // If direction actually changed, trigger turn sound
            if (!oldDirection.equals(this.direction) && this.game && this.head) {
                this.game.onSnakeTurn(this.head.position);
            }
        }

        // Store previous positions
        const previousPositions = this.segments.map(segment => segment.position.clone());
        const previousHeadPosition = this.head.position.clone();

        // Move head
        this.head.position.add(this.direction.clone().multiplyScalar(this.speed * deltaTime));

        // Update segments with smooth following
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (i === 0) {
                // First segment follows head with proper spacing
                const targetPos = previousHeadPosition.clone();
                segment.position.lerp(targetPos, 0.5);
            } else {
                // Other segments follow their previous positions
                const targetPos = previousPositions[i - 1].clone();
                segment.position.lerp(targetPos, 0.5);
            }
        }

        // Check for collisions after segment update
        this.checkCollisions();
    }

    checkWallCollision(position) {
        if (this.isGhost) return false;

        // If no position is provided, use the current head position
        const posToCheck = position || this.head.position;

        // Use the full world size without margin for the boundary
        const worldBoundary = this.worldSize / 2;
        const xCollision = Math.abs(posToCheck.x) > worldBoundary;
        const zCollision = Math.abs(posToCheck.z) > worldBoundary;

        if (xCollision || zCollision) {
            console.log('Snake: Wall collision detected', {
                position: posToCheck.clone(),
                currentPosition: this.head.position.clone(),
                xCollision,
                zCollision,
                worldSize: this.worldSize,
                boundary: worldBoundary,
                x: posToCheck.x,
                z: posToCheck.z
            });
            this.game.gameManager.gameOver();
            return true;
        }

        return false;
    }

    checkPelletCollisions() {
        if (!this.game.gameManager || !this.game.gameManager.pellets) return;

        for (let i = this.game.gameManager.pellets.length - 1; i >= 0; i--) {
            const pellet = this.game.gameManager.pellets[i];
            if (!pellet || !pellet.position) continue;

            const distance = this.head.position.distanceTo(pellet.position);
            const collisionThreshold = 1.2;

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

    cleanup() {
        // Remove ghost trails if they exist
        this.removeGhostTrail();

        // Remove all segments
        while (this.segments.length > 0) {
            const segment = this.segments.pop();
            this.group.remove(segment);
            if (segment.geometry) segment.geometry.dispose();
            if (segment.material) segment.material.dispose();
        }

        // Remove head
        if (this.head) {
            this.group.remove(this.head);
            if (this.head.geometry) this.head.geometry.dispose();
            if (this.head.material) this.head.material.dispose();
        }

        // Remove group from scene
        if (this.group && this.game.scene) {
            this.game.scene.remove(this.group);
        }

        // Clear references
        this.segments = [];
        this.head = null;
        this.group = null;

        console.log('Snake: Cleanup complete', {
            sceneChildren: this.game.scene.children.length,
            hasGroup: !!this.group,
            segmentsLength: this.segments.length
        });
    }

    checkCollisions() {
        // Skip collision checks until initialization is complete and movement is enabled
        if (!this.initialized || !this.movementEnabled || !this.collisionChecksEnabled) {
            return;
        }

        // Check wall collisions
        if (this.checkWallCollision()) {
            return;
        }
        
        // Check obstacle collisions
        if (this.game.gameManager.obstacleSystem) {
            const hasCollision = this.game.gameManager.obstacleSystem.checkCollisions({
                position: this.head.position,
                radius: this.collisionRadius * 0.6
            });
            if (hasCollision) {
                console.log('Snake: Obstacle collision detected');
                this.game.gameManager.gameOver();
                return;
            }
        }
        
        // Check self-collision with a more forgiving threshold
        const selfCollisionThreshold = this.segmentSpacing * 0.4;
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const distance = this.head.position.distanceTo(segment.position);
            if (distance < selfCollisionThreshold) {
                console.log('Snake: Self collision detected', {
                    distance,
                    threshold: selfCollisionThreshold,
                    segmentIndex: i,
                    headPosition: this.head.position.clone(),
                    segmentPosition: segment.position.clone(),
                    segmentSpacing: this.segmentSpacing,
                    frameCount: this.game.frameCount,
                    isRunning: this.game.isRunning,
                    isGameOver: this.game.gameManager.isGameOver,
                    isInitialized: this.initialized,
                    movementEnabled: this.movementEnabled,
                    collisionChecksEnabled: this.collisionChecksEnabled,
                    segmentDistances: this.segments.map((s, idx) => ({
                        index: idx,
                        distance: this.head.position.distanceTo(s.position)
                    }))
                });
                this.game.gameManager.gameOver();
                return;
            }
        }
    }

    setupInput() {
        // Handle keyboard input
        window.addEventListener('keydown', (e) => {
            if (!this.movementEnabled) return;

            let newDirection;
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    newDirection = new THREE.Vector3(0, 0, -1);
                    break;
                case 'arrowdown':
                case 's':
                    newDirection = new THREE.Vector3(0, 0, 1);
                    break;
                case 'arrowleft':
                case 'a':
                    newDirection = new THREE.Vector3(-1, 0, 0);
                    break;
                case 'arrowright':
                case 'd':
                    newDirection = new THREE.Vector3(1, 0, 0);
                    break;
                default:
                    return;
            }

            if (newDirection) {
                this.setDirection(newDirection);
            }
        });
    }
} 
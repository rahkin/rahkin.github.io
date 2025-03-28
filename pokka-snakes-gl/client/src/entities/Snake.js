import * as THREE from 'three';

export class Snake {
    constructor(game, position) {
        this.game = game;
        this.speed = 8;
        this.isGhost = false;
        this.segments = [];
        this.direction = new THREE.Vector3(0, 0, -1);
        this.nextDirection = this.direction.clone();
        
        // Create snake head with enhanced material
        const headGeometry = new THREE.BoxGeometry(1, 1, 1);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.castShadow = true;
        this.head.receiveShadow = true;
        
        // Add head glow effect
        this.headGlow = new THREE.PointLight(0x00ff00, 1, 3);
        
        // Create snake group and set its position
        this.group = new THREE.Group();
        this.group.position.copy(position);
        
        // Position head relative to group (at local origin)
        this.head.position.set(0, 0, 0);
        this.headGlow.position.copy(this.head.position);
        
        this.group.add(this.head);
        this.group.add(this.headGlow);
        
        // Add initial segments
        this.addSegment();
    }

    addSegment() {
        const segmentGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const segmentMaterial = new THREE.MeshStandardMaterial({
            color: 0x00dd00,
            emissive: 0x00dd00,
            emissiveIntensity: 0.2,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1
        });
        
        const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        segment.castShadow = true;
        segment.receiveShadow = true;
    
        // Position the new segment
        if (this.segments.length === 0) {
            // First segment goes behind head with proper spacing
            segment.position.copy(this.head.position).add(this.direction.clone().multiplyScalar(-1.05));
        } else {
            // Other segments go behind last segment with proper spacing
            const lastSegment = this.segments[this.segments.length - 1];
            segment.position.copy(lastSegment.position).add(this.direction.clone().multiplyScalar(-1.05));
        }
    
        this.segments.push(segment);
        this.group.add(segment);
    }

    grow() {
        this.addSegment();
    }

    update(deltaTime) {
        // Update direction
        this.direction.copy(this.nextDirection);
        
        // Store previous positions
        const previousPositions = [this.head.position.clone()];
        this.segments.forEach(segment => {
            previousPositions.push(segment.position.clone());
        });
        
        // Move head in local space
        const moveAmount = this.speed * deltaTime;
        this.head.position.add(this.direction.clone().multiplyScalar(moveAmount));
        
        // Update head glow position
        this.headGlow.position.copy(this.head.position);
        
        // Check world boundaries in world space
        const worldPos = new THREE.Vector3();
        this.head.getWorldPosition(worldPos);
        const worldSize = 45;
        
        if (Math.abs(worldPos.x) > worldSize || Math.abs(worldPos.z) > worldSize) {
            if (this.game.gameManager) {
                this.game.gameManager.gameOver();
            }
            return;
        }
        
        // Update segments with proper spacing and color gradient
        this.segments.forEach((segment, index) => {
            const targetPos = previousPositions[index];
            const currentPos = segment.position;
            const spacing = 1.05; // Space between segments
            
            // Calculate the direction to the target
            const direction = targetPos.clone().sub(currentPos);
            direction.normalize();
            
            // Move segment to maintain proper spacing
            segment.position.copy(targetPos).add(direction.multiplyScalar(-spacing));
            
            // Update segment color and glow based on position
            const colorIntensity = 1 - (index / this.segments.length) * 0.5;
            const hue = 0.3 + (index / this.segments.length) * 0.1; // Slight color shift
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            
            segment.material.color.copy(color);
            segment.material.emissive.copy(color);
            segment.material.emissiveIntensity = 0.2 * colorIntensity;
        });
        
        // Check for collisions with power-ups
        this.checkPowerUpCollisions();
    }

    checkPowerUpCollisions() {
        if (!this.game.powerUpSystem) return;
        
        // Get all power-up meshes in the scene
        this.game.scene.traverse(object => {
            if (object.userData.powerUpType) {
                const distance = this.head.position.distanceTo(object.position);
                if (distance < 1) {
                    // Collect power-up
                    this.game.powerUpSystem.activatePowerUp(object.userData.powerUpType, this);
                    this.game.scene.remove(object);
                    
                    // Update score
                    if (this.game.hud) {
                        this.game.hud.updateScore(10);
                    }
                }
            }
        });
    }

    checkCollision(object = null) {
        if (this.isGhost) return false;
        
        // Check wall collisions
        const worldSize = 45;
        if (Math.abs(this.head.position.x) > worldSize || 
            Math.abs(this.head.position.z) > worldSize) {
            return true;
        }
        
        // Check object collision if provided
        if (object) {
            const distance = this.head.position.distanceTo(object.position);
            return distance < 1;
        }
        
        // Check self collisions (skip first few segments to prevent false collisions)
        for (let i = 4; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (this.head.position.distanceTo(segment.position) < 1.05) { // Increased collision distance
                return true;
            }
        }
        
        return false;
    }

    setDirection(newDirection) {
        // Prevent 180-degree turns
        if (this.direction.dot(newDirection) > -0.5) {
            this.nextDirection.copy(newDirection);
        }
    }

    reset() {
        // Reset direction and properties
        this.direction.set(0, 0, -1);
        this.nextDirection.copy(this.direction);
        this.speed = 8;
        this.isGhost = false;
    
        // Remove all body segments
        this.segments.forEach(segment => {
            this.group.remove(segment);
            segment.geometry.dispose();
            segment.material.dispose();
        });
        this.segments = [];
    
        // Reset positions
        const startPosition = new THREE.Vector3(0, 0.5, 0);
        this.group.position.set(0, 0.5, 0);
        this.head.position.set(0, 0, 0);
        this.headGlow.position.copy(this.head.position);
        
        // Add new initial segment
        this.addSegment();
    }

    createSegment(position) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1
        });
        
        const segment = new THREE.Mesh(geometry, material);
        segment.position.copy(position);
        segment.castShadow = true;
        segment.receiveShadow = true;
        return segment;
    }

    addHeadGlow() {
        this.headLight = new THREE.PointLight(0x00ff00, 1, 2);
        this.headLight.position.copy(this.head.position);
        this.game.scene.add(this.headLight);
    }

    cleanup() {
        // ... existing cleanup code ...
        if (this.headLight) {
            this.game.scene.remove(this.headLight);
        }
    }
} 
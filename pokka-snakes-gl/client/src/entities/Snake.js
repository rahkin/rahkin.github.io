import * as THREE from 'three';

export class Snake {
    constructor(game, startPosition) {
        this.game = game;
        this.speed = 15;
        this.direction = new THREE.Vector3(1, 0, 0);
        this.nextDirection = this.direction.clone();
        this.segments = [];
        this.segmentSpacing = 0.8;
        this.isGhost = false;
        this.isInvincible = false;
        this.pointMultiplier = 1;
        this.hasRainbowTrail = false;
        this.hasMagnet = false;
        
        // Create snake group
        this.group = new THREE.Group();
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        this.material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x002200,
            shininess: 30
        });
        this.head = new THREE.Mesh(headGeometry, this.material);
        this.head.position.copy(startPosition);
        this.group.add(this.head);
        
        // Add initial segments
        for (let i = 0; i < 5; i++) {
            this.addSegment();
        }
    }

    update(deltaTime) {
        // Apply time scale if it exists
        const timeScale = this.game.timeScale || 1;
        const scaledDeltaTime = deltaTime * timeScale;
        
        // Update direction
        this.direction.copy(this.nextDirection);
        
        // Store previous positions for segments
        const positions = [this.head.position.clone()];
        for (const segment of this.segments) {
            positions.push(segment.position.clone());
        }
        
        // Move head
        const moveAmount = this.speed * scaledDeltaTime;
        this.head.position.add(this.direction.clone().multiplyScalar(moveAmount));
        
        // Update segments with proper spacing
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const targetPos = positions[i];
            const direction = new THREE.Vector3()
                .subVectors(targetPos, segment.position)
                .normalize();
            
            // Add minimum distance check to prevent segments from getting too close
            const currentDistance = segment.position.distanceTo(targetPos);
            if (currentDistance > this.segmentSpacing) {
                segment.position.add(direction.multiplyScalar(moveAmount));
            }
            
            // Update segment color for rainbow trail
            if (this.hasRainbowTrail) {
                const hue = ((Date.now() / 1000 + i * 0.1) % 1);
                segment.material.color.setHSL(hue, 1, 0.5);
            }
        }
    }

    checkCollisions() {
        // Check wall collisions first
        const headPos = this.head.position;
        const wallDistance = 45; // Half the ground size minus margin
        
        if (Math.abs(headPos.x) > wallDistance || Math.abs(headPos.z) > wallDistance) {
            console.log('Snake: Wall collision detected', {
                x: headPos.x,
                z: headPos.z,
                wallDistance
            });
            return true;
        }

        // Then check self collisions
        if (!this.isGhost) {
            for (let i = 1; i < this.segments.length; i++) {
                const segment = this.segments[i];
                const distance = headPos.distanceTo(segment.position);
                if (distance < 1.2) { // Increased collision radius
                    console.log('Snake: Self collision detected', {
                        distance,
                        segmentIndex: i
                    });
                    return true;
                }
            }
        }

        return false;
    }

    addSegment() {
        const segmentGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const segmentMaterial = this.material.clone();
        const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        
        // Position the new segment behind the last one
        if (this.segments.length > 0) {
            const lastSegment = this.segments[this.segments.length - 1];
            segment.position.copy(lastSegment.position);
        } else {
            segment.position.copy(this.head.position);
            segment.position.sub(this.direction.multiplyScalar(this.segmentSpacing));
        }
        
        this.segments.push(segment);
        this.group.add(segment);
    }

    setDirection(newDirection) {
        // Prevent 180-degree turns
        if (this.direction.dot(newDirection) !== -1) {
            this.nextDirection.copy(newDirection);
        }
    }

    grow() {
        this.addSegment();
    }

    reset() {
        // Reset direction and properties
        this.direction.set(1, 0, 0);
        this.nextDirection.copy(this.direction);
        this.speed = 15;
        this.isGhost = false;
        this.isInvincible = false;
        this.pointMultiplier = 1;
        this.hasRainbowTrail = false;
        this.hasMagnet = false;
    
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
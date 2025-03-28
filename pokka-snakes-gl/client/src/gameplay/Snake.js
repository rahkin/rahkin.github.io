import * as THREE from 'three';

export class Snake {
    constructor(scene, startPosition = new THREE.Vector3(0, 0, 0), config) {
        this.scene = scene;
        this.segments = [];
        this.direction = new THREE.Vector3(1, 0, 0);
        this.speed = config.speed;
        this.segmentSize = 0.8;
        this.segmentSpacing = 1.2;
        this.lastUpdateTime = 0;
        this.updateInterval = 16;
        this.score = 0;
        this.growthRate = config.growthRate;
        this.config = config;
        this.scoreMultiplier = 1;
        this.ghostMode = false;
        this.activePowerUps = new Set();
        
        // Enhanced materials
        this.materials = {
            head: new THREE.MeshPhongMaterial({ 
                color: 0x00ff00,
                specular: 0x00ff00,
                shininess: 30,
                emissive: 0x002200
            }),
            body: new THREE.MeshPhongMaterial({ 
                color: 0x008800,
                specular: 0x004400,
                shininess: 20,
                emissive: 0x001100
            })
        };

        // Create enhanced head
        const headGeometry = new THREE.BoxGeometry(
            this.segmentSize * 1.2, 
            this.segmentSize * 1.2, 
            this.segmentSize * 1.2
        );
        this.head = new THREE.Mesh(headGeometry, this.materials.head);
        this.head.position.copy(startPosition);
        
        // Add eyes to head
        this.addEyes();
        
        this.segments.push(this.head);
        this.scene.add(this.head);
        
        // Initialize positions history
        this.positionsHistory = [];
        this.updatePositionsHistory();
        
        // Add initial tail segments based on difficulty
        for (let i = 0; i < config.initialLength; i++) {
            this.addSegment();
        }
    }

    updatePositionsHistory() {
        // Keep only enough history for current segments plus some buffer
        const requiredLength = (this.segments.length + 1) * 10;
        while (this.positionsHistory.length < requiredLength) {
            const lastPos = this.positionsHistory.length > 0 
                ? this.positionsHistory[this.positionsHistory.length - 1].clone()
                : this.head.position.clone();
            lastPos.x -= this.segmentSpacing;
            this.positionsHistory.push(lastPos);
        }
    }

    addEyes() {
        // Create eye geometry with smaller size
        const eyeGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        
        // Create white part of eyes
        const eyeWhiteMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.2
        });
        
        // Create pupils
        const pupilGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const pupilMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            emissive: 0x000000
        });

        // Create eye assemblies
        const leftEye = new THREE.Group();
        const rightEye = new THREE.Group();

        // Create white parts
        const leftEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        const rightEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);

        // Create pupils
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);

        // Position pupils slightly in front of eye whites
        leftPupil.position.x = 0.08;
        rightPupil.position.x = 0.08;

        // Add pupils to eyes
        leftEye.add(leftEyeWhite);
        leftEye.add(leftPupil);
        rightEye.add(rightEyeWhite);
        rightEye.add(rightPupil);

        // Position eyes on head
        leftEye.position.set(0.4, 0.2, 0.25);
        rightEye.position.set(0.4, 0.2, -0.25);

        // Add eyes to head
        this.head.add(leftEye);
        this.head.add(rightEye);

        // Store references to eyes for potential animation
        this.eyes = {
            left: leftEye,
            right: rightEye,
            leftPupil: leftPupil,
            rightPupil: rightPupil
        };
    }

    addSegment() {
        const geometry = new THREE.BoxGeometry(
            this.segmentSize, 
            this.segmentSize, 
            this.segmentSize
        );
        
        // Create segment with enhanced material
        const segment = new THREE.Mesh(geometry, this.materials.body);
        
        // Position the new segment at the end of the snake
        const lastSegment = this.segments[this.segments.length - 1];
        const direction = this.direction.clone().multiplyScalar(-1);
        segment.position.copy(lastSegment.position);
        segment.position.add(direction.multiplyScalar(this.segmentSpacing));
        
        this.segments.push(segment);
        this.scene.add(segment);
        
        // Update history after adding new segment
        this.updatePositionsHistory();
    }

    update() {
        const currentTime = Date.now();
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = currentTime;

        // Move head
        const moveAmount = this.direction.clone().multiplyScalar(this.speed);
        this.head.position.add(moveAmount);

        // Update positions history
        this.positionsHistory.unshift(this.head.position.clone());
        this.positionsHistory.splice(this.segments.length * 10); // Keep only needed positions

        // Update tail segments
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const targetIndex = i * 10;
            if (targetIndex < this.positionsHistory.length) {
                segment.position.copy(this.positionsHistory[targetIndex]);
            }
        }

        // Update head rotation based on direction
        const angle = Math.atan2(this.direction.y, this.direction.x);
        this.head.rotation.z = angle;

        // Optional: Animate pupils to look in movement direction
        if (this.eyes) {
            const pupilOffset = Math.sin(Date.now() * 0.003) * 0.02;
            this.eyes.leftPupil.position.y = pupilOffset;
            this.eyes.rightPupil.position.y = pupilOffset;
        }
    }

    checkPelletCollision(pellet) {
        const distance = this.head.position.distanceTo(pellet.getPosition());
        return distance < 1;
    }

    grow() {
        // Add segments based on growth rate
        for (let i = 0; i < this.growthRate; i++) {
            this.addSegment();
        }
    }

    setDirection(newDirection) {
        // Prevent 180-degree turns
        if (this.direction.dot(newDirection) !== -1) {
            this.direction.copy(newDirection).normalize();
        }
    }

    getScore() {
        return this.score;
    }

    addScore(points = null) {
        this.score += (points ?? this.config.pelletValue) * this.scoreMultiplier;
    }

    checkSelfCollision() {
        // Start checking after snake has minimum length
        if (this.segments.length < 5) return false;

        const headPos = this.head.position;
        // Check collision with all segments except the first few
        for (let i = 5; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const distance = headPos.distanceTo(segment.position);
            if (distance < this.segmentSize * 0.8) {
                return true;
            }
        }
        return false;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setScoreMultiplier(multiplier) {
        this.scoreMultiplier = multiplier;
    }

    setGhostMode(enabled) {
        this.ghostMode = enabled;
        // Update materials for ghost mode
        const opacity = enabled ? 0.5 : 1;
        this.materials.head.transparent = enabled;
        this.materials.body.transparent = enabled;
        this.materials.head.opacity = opacity;
        this.materials.body.opacity = opacity;
    }
} 
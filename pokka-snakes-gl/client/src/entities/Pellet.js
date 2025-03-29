import * as THREE from 'three';

export class Pellet {
    constructor(game, position, type = 'normal') {
        this.game = game;
        this.type = type;
        this.velocity = new THREE.Vector3();
        
        // Set position or generate random position
        this.position = position || new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            0.5,
            (Math.random() - 0.5) * 40
        );

        // Create visual appearance based on type
        this.createMesh();
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.glow);

        // Initialize hover animation
        this.initialY = this.position.y;
        this.hoverOffset = Math.random() * Math.PI * 2;
        this.hoverSpeed = 1.5 + Math.random() * 0.5;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
    }

    createMesh() {
        // Create main pellet geometry with more segments for smoother look
        const geometry = new THREE.SphereGeometry(0.3, 24, 24);
        const color = this.type === 'normal' ? 0xFAA70D : 0xE179DA;
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            shininess: 50,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Create glow effect
        const glowGeometry = new THREE.SphereGeometry(0.4, 24, 24);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });

        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.position.copy(this.position);
    }

    update(deltaTime) {
        const time = performance.now() * 0.001;
        
        // Hover animation
        const hoverHeight = 0.1;
        const newY = this.initialY + Math.sin(time * this.hoverSpeed + this.hoverOffset) * hoverHeight;
        this.position.y = newY;
        this.mesh.position.y = newY;
        this.glow.position.y = newY;

        // Rotation animation
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        this.glow.rotation.y = this.mesh.rotation.y;

        // Glow pulse animation
        const glowScale = 1 + Math.sin(time * 2) * 0.1;
        this.glow.scale.set(glowScale, glowScale, glowScale);

        // Update position if needed
        if (this.velocity.lengthSq() > 0) {
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            this.mesh.position.copy(this.position);
            this.glow.position.copy(this.position);
        }
    }

    cleanup() {
        if (this.mesh) {
            this.game.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        if (this.glow) {
            this.game.scene.remove(this.glow);
            if (this.glow.geometry) this.glow.geometry.dispose();
            if (this.glow.material) this.glow.material.dispose();
        }
    }
} 
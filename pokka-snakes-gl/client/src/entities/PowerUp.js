import * as THREE from 'three';

export class PowerUp {
    constructor(game, type) {
        this.game = game;
        this.type = type;
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * 80,
            0.5,
            (Math.random() - 0.5) * 80
        );

        this.createMesh();
        this.game.scene.add(this.mesh);
    }

    createMesh() {
        const colors = {
            ghost: 0x808080,     // Gray
            timeSlow: 0x00ffff,  // Cyan
            magnet: 0xff00ff,    // Magenta
            shield: 0xffff00     // Yellow
        };

        // Create main power-up mesh
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: colors[this.type] || 0xffffff,
            emissive: colors[this.type] || 0xffffff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: colors[this.type] || 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glowMesh);

        // Add floating animation
        this.initialY = this.position.y;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(deltaTime) {
        // Update floating animation
        const time = performance.now() * 0.001;
        this.mesh.position.y = this.initialY + Math.sin(time + this.floatOffset) * 0.2;
        this.mesh.rotation.y += deltaTime;

        // Update glow effect
        const glowIntensity = 0.3 + Math.sin(time * 2) * 0.1;
        this.mesh.children[0].material.opacity = glowIntensity;
    }

    collect() {
        // Remove from scene
        this.game.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh.children[0].geometry.dispose();
        this.mesh.children[0].material.dispose();
    }

    applyEffect(snake) {
        switch(this.type) {
            case 'speed':
                snake.speed *= 1.5;
                setTimeout(() => { snake.speed /= 1.5; }, this.duration);
                break;
            case 'size':
                for(let i = 0; i < 3; i++) snake.grow();
                break;
            case 'ghost':
                snake.segments.forEach(segment => {
                    segment.material.transparent = true;
                    segment.material.opacity = 0.3;
                });
                setTimeout(() => {
                    snake.segments.forEach(segment => {
                        segment.material.transparent = false;
                        segment.material.opacity = 1;
                    });
                }, this.duration);
                break;
            case 'magnet':
                snake.magnetActive = true;
                setTimeout(() => { snake.magnetActive = false; }, this.duration);
                break;
            case 'shield':
                snake.isInvulnerable = true;
                setTimeout(() => { snake.isInvulnerable = false; }, this.duration);
                break;
        }
    }
} 
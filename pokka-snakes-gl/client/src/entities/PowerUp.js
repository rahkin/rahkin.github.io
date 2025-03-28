import * as THREE from 'three';

export class PowerUp {
    constructor(game, type) {
        this.game = game;
        this.type = type;
        this.duration = this.getPowerUpDuration(type);
        this.mesh = this.createPowerUpMesh(type);
        this.position = this.getRandomPosition();
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
    }

    createPowerUpMesh(type) {
        const geometry = new THREE.OctahedronGeometry(0.5);
        const material = new THREE.MeshStandardMaterial({
            color: this.getPowerUpColor(type),
            emissive: this.getPowerUpColor(type),
            emissiveIntensity: 0.7,
            metalness: 1,
            roughness: 0.2,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        return mesh;
    }

    getPowerUpColor(type) {
        const colors = {
            speed: 0x00ff00,
            size: 0xff00ff,
            ghost: 0x88ffff,
            magnet: 0xffaa00,
            shield: 0x0088ff
        };
        return colors[type] || colors.speed;
    }

    getPowerUpDuration(type) {
        const durations = {
            speed: 5000,
            size: 8000,
            ghost: 3000,
            magnet: 6000,
            shield: 4000
        };
        return durations[type] || 5000;
    }

    getRandomPosition() {
        const range = 45;
        return new THREE.Vector3(
            (Math.random() - 0.5) * range * 2,
            0.5,
            (Math.random() - 0.5) * range * 2
        );
    }

    update(deltaTime) {
        // Floating and rotation animation
        this.mesh.position.y = this.position.y + 
            Math.sin(Date.now() * 0.002) * 0.2;
        this.mesh.rotation.y += deltaTime * 3;
        this.mesh.rotation.x += deltaTime * 2;
    }

    collect() {
        this.game.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
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
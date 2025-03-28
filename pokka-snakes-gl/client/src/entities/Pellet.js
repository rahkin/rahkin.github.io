import * as THREE from 'three';

export class Pellet {
    constructor(game, position, type = 'normal') {
        this.game = game;
        this.type = type;
        this.value = this.getPelletValue(type);
        this.mesh = this.createPelletMesh(type);
        this.position = position || this.getRandomPosition();
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
        
        // Add glow effect
        this.addGlowEffect();
        
        // Add particle effect for special pellets
        if (type !== 'normal') {
            this.addParticleEffect();
        }
    }

    createPelletMesh(type) {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.getPelletColor(type),
            emissive: this.getPelletColor(type),
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add pulsing effect for special pellets
        if (type !== 'normal') {
            mesh.userData.pulseSpeed = 0.003;
            mesh.userData.pulseScale = 0.1;
        }
        
        return mesh;
    }

    addGlowEffect() {
        const light = new THREE.PointLight(
            this.getPelletColor(this.type),
            1,
            2
        );
        light.position.copy(this.mesh.position);
        this.game.scene.add(light);
        this.light = light;
    }

    addParticleEffect() {
        const particleCount = 5;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: this.getPelletColor(this.type),
                emissive: this.getPelletColor(this.type),
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.6
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(this.mesh.position);
            particle.userData.angle = (i / particleCount) * Math.PI * 2;
            particle.userData.radius = 0.5;
            particle.userData.speed = 0.002 + Math.random() * 0.001;
            
            this.game.scene.add(particle);
            particles.push(particle);
        }
        
        this.particles = particles;
    }

    getPelletColor(type) {
        const colors = {
            normal: 0xffff00,    // Yellow - normal pellet
            speed: 0xff00ff,     // Magenta - speed boost
            shield: 0x00ffff,    // Cyan - shield
            multiplier: 0xff8800, // Orange - score multiplier
            shrink: 0x0088ff     // Blue - shrink
        };
        return colors[type] || colors.normal;
    }

    getPelletValue(type) {
        const values = {
            normal: 100,
            speed: 150,
            shield: 200,
            multiplier: 250,
            shrink: 150
        };
        return values[type] || values.normal;
    }

    getRandomPosition() {
        const range = 45; // Half the ground size minus margin
        return new THREE.Vector3(
            (Math.random() - 0.5) * range * 2,
            0.3, // Slightly above ground
            (Math.random() - 0.5) * range * 2
        );
    }

    update(deltaTime) {
        // Floating animation
        this.mesh.position.y = this.position.y + 
            Math.sin(Date.now() * 0.003) * 0.1;
        
        // Rotation
        this.mesh.rotation.y += deltaTime * 2;
        
        // Update light position
        if (this.light) {
            this.light.position.copy(this.mesh.position);
        }
        
        // Update particle effects
        if (this.particles) {
            this.particles.forEach(particle => {
                particle.userData.angle += particle.userData.speed;
                const x = Math.cos(particle.userData.angle) * particle.userData.radius;
                const z = Math.sin(particle.userData.angle) * particle.userData.radius;
                particle.position.x = this.mesh.position.x + x;
                particle.position.z = this.mesh.position.z + z;
                particle.position.y = this.mesh.position.y + Math.sin(Date.now() * 0.002) * 0.05;
            });
        }
        
        // Update pulsing effect for special pellets
        if (this.mesh.userData.pulseSpeed) {
            const scale = 1 + Math.sin(Date.now() * this.mesh.userData.pulseSpeed) * this.mesh.userData.pulseScale;
            this.mesh.scale.set(scale, scale, scale);
        }
    }

    collect() {
        // Remove main mesh and light
        this.game.scene.remove(this.mesh);
        if (this.light) {
            this.game.scene.remove(this.light);
        }
        
        // Remove particle effects
        if (this.particles) {
            this.particles.forEach(particle => {
                this.game.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
            });
        }
        
        // Cleanup geometries and materials
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
        
        // Apply pellet effect
        this.applyEffect();
    }

    applyEffect() {
        if (!this.game.snake) return;

        switch (this.type) {
            case 'speed':
                this.game.snake.speed *= 1.5;
                setTimeout(() => {
                    this.game.snake.speed /= 1.5;
                }, 5000); // 5 seconds duration
                break;
                
            case 'shield':
                this.game.snake.isGhost = true;
                setTimeout(() => {
                    this.game.snake.isGhost = false;
                }, 8000); // 8 seconds duration
                break;
                
            case 'multiplier':
                if (this.game.hud) {
                    this.game.hud.scoreMultiplier *= 2;
                    setTimeout(() => {
                        this.game.hud.scoreMultiplier /= 2;
                    }, 10000); // 10 seconds duration
                }
                break;
                
            case 'shrink':
                const originalScale = this.game.snake.group.scale.clone();
                this.game.snake.group.scale.multiplyScalar(0.7);
                setTimeout(() => {
                    this.game.snake.group.scale.copy(originalScale);
                }, 6000); // 6 seconds duration
                break;
        }
    }
} 
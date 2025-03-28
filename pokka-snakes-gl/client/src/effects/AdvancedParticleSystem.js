import * as THREE from 'three';

export class AdvancedParticleSystem {
    constructor(game) {
        this.game = game;
        this.particleSystems = new Map();
        this.emitters = new Map();
        
        this.setupParticleMaterials();
        this.initializeEmitters();
    }

    setupParticleMaterials() {
        this.materials = {
            standard: new THREE.PointsMaterial({
                size: 2,
                blending: THREE.AdditiveBlending,
                transparent: true,
                vertexColors: true
            }),
            
            trail: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0xffffff) }
                },
                vertexShader: `
                    uniform float time;
                    attribute float size;
                    attribute vec3 customColor;
                    varying vec3 vColor;
                    void main() {
                        vColor = customColor;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z) * 
                            (sin(time + position.x * 0.05) * 0.5 + 0.5);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    void main() {
                        float r = length(gl_PointCoord - vec2(0.5));
                        if (r > 0.5) discard;
                        gl_FragColor = vec4(vColor, 1.0 - (r * 2.0));
                    }
                `,
                blending: THREE.AdditiveBlending,
                transparent: true
            }),
            
            spark: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: `
                    uniform float time;
                    attribute float life;
                    attribute vec3 velocity;
                    varying float vAlpha;
                    void main() {
                        vec3 pos = position + velocity * time;
                        vAlpha = 1.0 - (time / life);
                        gl_Position = projectionMatrix * 
                            modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = 2.0 * vAlpha;
                    }
                `,
                fragmentShader: `
                    varying float vAlpha;
                    void main() {
                        gl_FragColor = vec4(1.0, 0.6, 0.1, vAlpha);
                    }
                `,
                blending: THREE.AdditiveBlending,
                transparent: true
            })
        };
    }

    initializeEmitters() {
        // Snake trail emitter
        this.createEmitter('snakeTrail', {
            particleCount: 1000,
            emissionRate: 60,
            lifetime: { min: 0.5, max: 1.0 },
            size: { min: 1, max: 3 },
            speed: { min: 0.1, max: 0.3 },
            color: new THREE.Color(0x00ff00),
            material: this.materials.trail,
            updateFunction: this.updateTrailParticles.bind(this)
        });

        // Explosion emitter
        this.createEmitter('explosion', {
            particleCount: 500,
            emissionRate: 0, // Burst emission
            lifetime: { min: 0.5, max: 1.0 },
            size: { min: 2, max: 4 },
            speed: { min: 5, max: 10 },
            color: new THREE.Color(0xff5500),
            material: this.materials.spark,
            updateFunction: this.updateExplosionParticles.bind(this)
        });

        // Power-up sparkle emitter
        this.createEmitter('powerUpSparkle', {
            particleCount: 200,
            emissionRate: 20,
            lifetime: { min: 1.0, max: 2.0 },
            size: { min: 1, max: 2 },
            speed: { min: 0.2, max: 0.5 },
            color: new THREE.Color(0xffff00),
            material: this.materials.standard,
            updateFunction: this.updateSparkleParticles.bind(this)
        });
    }

    createEmitter(type, config) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.particleCount * 3);
        const velocities = new Float32Array(config.particleCount * 3);
        const colors = new Float32Array(config.particleCount * 3);
        const sizes = new Float32Array(config.particleCount);
        const lifetimes = new Float32Array(config.particleCount);

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', 
            new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('customColor', 
            new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', 
            new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('lifetime', 
            new THREE.BufferAttribute(lifetimes, 1));

        const particles = new THREE.Points(geometry, config.material);
        this.game.scene.add(particles);

        this.emitters.set(type, {
            config: config,
            particles: particles,
            active: new Set(),
            lastEmissionTime: 0
        });
    }

    emit(type, position, count = 1) {
        const emitter = this.emitters.get(type);
        if (!emitter) return;

        const config = emitter.config;
        const geometry = emitter.particles.geometry;
        const positions = geometry.attributes.position.array;
        const velocities = geometry.attributes.velocity.array;
        const colors = geometry.attributes.customColor.array;
        const sizes = geometry.attributes.size.array;
        const lifetimes = geometry.attributes.lifetime.array;

        for (let i = 0; i < count; i++) {
            const index = this.findAvailableParticleIndex(emitter);
            if (index === -1) break;

            const i3 = index * 3;
            
            // Position
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            // Velocity
            const velocity = this.generateRandomVelocity(config.speed);
            velocities[i3] = velocity.x;
            velocities[i3 + 1] = velocity.y;
            velocities[i3 + 2] = velocity.z;

            // Color
            colors[i3] = config.color.r;
            colors[i3 + 1] = config.color.g;
            colors[i3 + 2] = config.color.b;

            // Size and lifetime
            sizes[index] = THREE.MathUtils.randFloat(
                config.size.min, 
                config.size.max
            );
            lifetimes[index] = THREE.MathUtils.randFloat(
                config.lifetime.min, 
                config.lifetime.max
            );

            emitter.active.add(index);
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.velocity.needsUpdate = true;
        geometry.attributes.customColor.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
        geometry.attributes.lifetime.needsUpdate = true;
    }

    update(deltaTime) {
        this.emitters.forEach((emitter, type) => {
            // Update emission
            if (emitter.config.emissionRate > 0) {
                const now = Date.now();
                const emissionInterval = 1000 / emitter.config.emissionRate;
                
                if (now - emitter.lastEmissionTime >= emissionInterval) {
                    this.emit(type, emitter.config.position);
                    emitter.lastEmissionTime = now;
                }
            }

            // Update particles
            if (emitter.config.updateFunction) {
                emitter.config.updateFunction(emitter, deltaTime);
            }
        });
    }

    updateTrailParticles(emitter, deltaTime) {
        const geometry = emitter.particles.geometry;
        const positions = geometry.attributes.position.array;
        const velocities = geometry.attributes.velocity.array;
        const sizes = geometry.attributes.size.array;
        const lifetimes = geometry.attributes.lifetime.array;

        emitter.active.forEach(index => {
            const i3 = index * 3;
            
            // Update position
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

            // Update size
            sizes[index] *= 0.99;

            // Update lifetime
            lifetimes[index] -= deltaTime;
            if (lifetimes[index] <= 0) {
                emitter.active.delete(index);
            }
        });

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }

    updateExplosionParticles(emitter, deltaTime) {
        const geometry = emitter.particles.geometry;
        const positions = geometry.attributes.position.array;
        const velocities = geometry.attributes.velocity.array;
        const colors = geometry.attributes.customColor.array;
        const lifetimes = geometry.attributes.lifetime.array;

        emitter.active.forEach(index => {
            const i3 = index * 3;
            
            // Update position with gravity
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += (velocities[i3 + 1] - 9.8 * deltaTime) * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

            // Update velocity
            velocities[i3 + 1] -= 9.8 * deltaTime;

            // Update color based on lifetime
            const lifeRatio = lifetimes[index] / 
                emitter.config.lifetime.max;
            colors[i3] = lifeRatio;
            colors[i3 + 1] = lifeRatio * 0.6;
            colors[i3 + 2] = lifeRatio * 0.1;

            // Update lifetime
            lifetimes[index] -= deltaTime;
            if (lifetimes[index] <= 0) {
                emitter.active.delete(index);
            }
        });

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.velocity.needsUpdate = true;
        geometry.attributes.customColor.needsUpdate = true;
    }

    updateSparkleParticles(emitter, deltaTime) {
        const geometry = emitter.particles.geometry;
        const positions = geometry.attributes.position.array;
        const sizes = geometry.attributes.size.array;
        const lifetimes = geometry.attributes.lifetime.array;

        emitter.active.forEach(index => {
            const i3 = index * 3;
            
            // Spiral movement
            const angle = Date.now() * 0.001 + index;
            const radius = 1 - (lifetimes[index] / 
                emitter.config.lifetime.max);
            
            positions[i3] += Math.cos(angle) * radius * deltaTime;
            positions[i3 + 1] += Math.sin(angle) * radius * deltaTime;

            // Pulsating size
            sizes[index] = emitter.config.size.min + 
                Math.sin(Date.now() * 0.01 + index) * 
                (emitter.config.size.max - emitter.config.size.min);

            // Update lifetime
            lifetimes[index] -= deltaTime;
            if (lifetimes[index] <= 0) {
                emitter.active.delete(index);
            }
        });

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }

    findAvailableParticleIndex(emitter) {
        const geometry = emitter.particles.geometry;
        const count = geometry.attributes.position.count;
        
        for (let i = 0; i < count; i++) {
            if (!emitter.active.has(i)) {
                return i;
            }
        }
        
        return -1;
    }

    generateRandomVelocity(speed) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const magnitude = THREE.MathUtils.randFloat(speed.min, speed.max);

        return new THREE.Vector3(
            magnitude * Math.sin(phi) * Math.cos(theta),
            magnitude * Math.sin(phi) * Math.sin(theta),
            magnitude * Math.cos(phi)
        );
    }

    cleanup() {
        this.emitters.forEach(emitter => {
            this.game.scene.remove(emitter.particles);
        });
        this.emitters.clear();
    }
} 
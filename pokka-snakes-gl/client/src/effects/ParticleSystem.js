export class ParticleSystem {
    constructor(maxParticles = 10000) {
        this.maxParticles = maxParticles;
        this.particles = [];
        this.particleIndex = 0;
        
        this.initGeometry();
        this.initMaterial();
        this.initSystem();
    }

    initGeometry() {
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);
        const sizes = new Float32Array(this.maxParticles);
        const lifetimes = new Float32Array(this.maxParticles);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    }

    initMaterial() {
        const vertexShader = `
            attribute float size;
            attribute float lifetime;
            attribute vec3 color;
            
            varying vec3 vColor;
            varying float vLifetime;
            
            void main() {
                vColor = color;
                vLifetime = lifetime;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;
            varying float vLifetime;
            
            void main() {
                if (vLifetime <= 0.0) discard;
                
                vec2 xy = gl_PointCoord.xy - vec2(0.5);
                float r = length(xy);
                if (r > 0.5) discard;
                
                float alpha = smoothstep(0.5, 0.0, r) * vLifetime;
                gl_FragColor = vec4(vColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
    }

    initSystem() {
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
    }

    emit(position, options = {}) {
        const {
            color = new THREE.Color(0xffffff),
            size = 10,
            lifetime = 1,
            velocity = new THREE.Vector3(),
            spread = 1,
            count = 1
        } = options;

        for (let i = 0; i < count; i++) {
            if (this.particleIndex >= this.maxParticles) {
                this.particleIndex = 0;
            }

            const pos = position.clone();
            const vel = velocity.clone();

            // Add random spread
            pos.x += (Math.random() - 0.5) * spread;
            pos.y += (Math.random() - 0.5) * spread;
            pos.z += (Math.random() - 0.5) * spread;

            this.particles[this.particleIndex] = {
                position: pos,
                velocity: vel,
                color: color.clone(),
                size: size * (0.5 + Math.random() * 0.5),
                lifetime: lifetime,
                initialLifetime: lifetime
            };

            this.updateParticleAttributes(this.particleIndex);
            this.particleIndex++;
        }
    }

    updateParticleAttributes(index) {
        const particle = this.particles[index];
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const sizes = this.geometry.attributes.size.array;
        const lifetimes = this.geometry.attributes.lifetime.array;

        positions[index * 3] = particle.position.x;
        positions[index * 3 + 1] = particle.position.y;
        positions[index * 3 + 2] = particle.position.z;

        colors[index * 3] = particle.color.r;
        colors[index * 3 + 1] = particle.color.g;
        colors[index * 3 + 2] = particle.color.b;

        sizes[index] = particle.size;
        lifetimes[index] = particle.lifetime / particle.initialLifetime;

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.lifetime.needsUpdate = true;
    }

    update(deltaTime) {
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            if (!particle) continue;

            particle.lifetime -= deltaTime;
            if (particle.lifetime <= 0) {
                particle.lifetime = 0;
                continue;
            }

            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            particle.velocity.y -= 9.8 * deltaTime; // gravity
            particle.size *= 0.99; // shrink

            this.updateParticleAttributes(i);
        }

        this.material.uniforms.time.value += deltaTime;
    }

    createExplosion(position, color) {
        this.emit(position, {
            color: color || new THREE.Color(0xffff00),
            size: 20,
            lifetime: 2,
            spread: 2,
            count: 50,
            velocity: new THREE.Vector3(0, 5, 0)
        });
    }

    createTrail(position, color) {
        this.emit(position, {
            color: color || new THREE.Color(0x00ffff),
            size: 5,
            lifetime: 0.5,
            spread: 0.2,
            count: 3,
            velocity: new THREE.Vector3(0, 0.5, 0)
        });
    }
} 
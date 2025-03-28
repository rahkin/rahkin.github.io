export class SpecialEffectsSystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.effects = new Map();
        this.composer = this.setupComposer();
        this.shaders = this.initializeShaders();
        this.particleSystems = new Map();
        
        this.setupPostProcessing();
    }

    setupComposer() {
        const composer = new THREE.EffectComposer(this.renderer);
        const renderPass = new THREE.RenderPass(this.scene, this.scene.camera);
        composer.addPass(renderPass);
        return composer;
    }

    initializeShaders() {
        return {
            glowShader: {
                uniforms: {
                    tDiffuse: { value: null },
                    intensity: { value: 1.0 },
                    color: { value: new THREE.Color(0x00ff00) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float intensity;
                    uniform vec3 color;
                    varying vec2 vUv;

                    void main() {
                        vec4 texel = texture2D(tDiffuse, vUv);
                        float brightness = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
                        vec3 glow = color * brightness * intensity;
                        gl_FragColor = vec4(texel.rgb + glow, 1.0);
                    }
                `
            },
            distortionShader: {
                uniforms: {
                    tDiffuse: { value: null },
                    time: { value: 0 },
                    amount: { value: 0.5 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float time;
                    uniform float amount;
                    varying vec2 vUv;

                    void main() {
                        vec2 offset = amount * vec2(
                            sin(time + vUv.y * 10.0),
                            cos(time + vUv.x * 10.0)
                        );
                        gl_FragColor = texture2D(tDiffuse, vUv + offset);
                    }
                `
            }
        };
    }

    setupPostProcessing() {
        // Add post-processing passes
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.composer.addPass(bloomPass);

        const glowPass = new THREE.ShaderPass(
            new THREE.ShaderMaterial(this.shaders.glowShader)
        );
        this.composer.addPass(glowPass);

        this.effects.set('bloom', bloomPass);
        this.effects.set('glow', glowPass);
    }

    createExplosionEffect(position, color = 0xffff00) {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const baseColor = new THREE.Color(color);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Position
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            // Velocity
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            velocities[i3] = Math.sin(angle) * Math.cos(elevation) * speed;
            velocities[i3 + 1] = Math.sin(elevation) * speed;
            velocities[i3 + 2] = Math.cos(angle) * Math.cos(elevation) * speed;

            // Color
            colors[i3] = baseColor.r + (Math.random() * 0.2 - 0.1);
            colors[i3 + 1] = baseColor.g + (Math.random() * 0.2 - 0.1);
            colors[i3 + 2] = baseColor.b + (Math.random() * 0.2 - 0.1);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                size: { value: 4.0 }
            },
            vertexShader: `
                attribute vec3 velocity;
                attribute vec3 color;
                uniform float time;
                uniform float size;
                varying vec3 vColor;

                void main() {
                    vColor = color;
                    vec3 pos = position + velocity * time;
                    pos.y -= 4.9 * time * time; // Gravity
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (1.0 - time);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0 - (d * 2.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);

        const explosion = {
            mesh: particles,
            startTime: performance.now(),
            duration: 2000 // 2 seconds
        };

        this.particleSystems.set(particles.id, explosion);
        
        // Remove after duration
        setTimeout(() => {
            this.scene.remove(particles);
            this.particleSystems.delete(particles.id);
        }, explosion.duration);
    }

    createTrailEffect(object, color = 0x00ff00) {
        const maxPoints = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });

        const trail = new THREE.Line(geometry, material);
        this.scene.add(trail);

        const trailSystem = {
            mesh: trail,
            points: [],
            maxPoints: maxPoints,
            update: () => {
                const positions = trail.geometry.attributes.position.array;
                
                // Add new point
                trailSystem.points.unshift(object.position.clone());
                if (trailSystem.points.length > maxPoints) {
                    trailSystem.points.pop();
                }

                // Update positions
                for (let i = 0; i < trailSystem.points.length; i++) {
                    const point = trailSystem.points[i];
                    positions[i * 3] = point.x;
                    positions[i * 3 + 1] = point.y;
                    positions[i * 3 + 2] = point.z;
                }

                trail.geometry.attributes.position.needsUpdate = true;
            }
        };

        this.particleSystems.set(trail.id, trailSystem);
        return trail.id;
    }

    removeTrailEffect(id) {
        const trail = this.particleSystems.get(id);
        if (trail) {
            this.scene.remove(trail.mesh);
            this.particleSystems.delete(id);
        }
    }

    createPowerUpEffect(position, color = 0x00ffff) {
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(color) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normal;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    float pulse = sin(time * 3.0) * 0.5 + 0.5;
                    float edge = sin(vPosition.y * 10.0 + time * 2.0) * 0.5 + 0.5;
                    vec3 glow = color * (pulse * 0.5 + 0.5);
                    float alpha = edge * pulse;
                    gl_FragColor = vec4(glow, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const powerUp = new THREE.Mesh(geometry, material);
        powerUp.position.copy(position);
        this.scene.add(powerUp);

        const effect = {
            mesh: powerUp,
            startTime: performance.now(),
            update: (time) => {
                powerUp.material.uniforms.time.value = time;
                powerUp.rotation.y += 0.02;
                powerUp.position.y = position.y + Math.sin(time * 2) * 0.2;
            }
        };

        this.particleSystems.set(powerUp.id, effect);
        return powerUp.id;
    }

    update(deltaTime) {
        const time = performance.now() * 0.001;

        // Update all particle systems
        this.particleSystems.forEach((system, id) => {
            if (system.update) {
                system.update(time);
            }
        });

        // Update shader uniforms
        this.effects.get('glow').uniforms.time.value = time;

        // Render with post-processing
        this.composer.render(deltaTime);
    }

    resize(width, height) {
        this.composer.setSize(width, height);
    }
} 
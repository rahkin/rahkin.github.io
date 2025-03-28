export class VisualEffectsManager {
    constructor(game) {
        this.game = game;
        this.effects = new Map();
        this.composer = null;
        
        this.setupEffectComposer();
        this.initializeShaders();
        this.setupEffects();
    }

    setupEffectComposer() {
        this.composer = new THREE.EffectComposer(this.game.renderer);
        
        // Add render pass
        const renderPass = new THREE.RenderPass(
            this.game.scene, 
            this.game.camera
        );
        this.composer.addPass(renderPass);
    }

    initializeShaders() {
        this.shaders = {
            glow: {
                vertex: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * 
                            modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragment: `
                    uniform vec3 color;
                    uniform float intensity;
                    varying vec2 vUv;
                    void main() {
                        float dist = length(vUv - vec2(0.5));
                        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                        gl_FragColor = vec4(color, 1.0) * glow * intensity;
                    }
                `
            },
            trail: {
                vertex: `
                    attribute float size;
                    attribute vec3 customColor;
                    varying vec3 vColor;
                    void main() {
                        vColor = customColor;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragment: `
                    uniform sampler2D pointTexture;
                    varying vec3 vColor;
                    void main() {
                        gl_FragColor = vec4(vColor, 1.0) * 
                            texture2D(pointTexture, gl_PointCoord);
                    }
                `
            },
            distortion: {
                vertex: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * 
                            modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragment: `
                    uniform float time;
                    uniform float intensity;
                    uniform sampler2D tDiffuse;
                    varying vec2 vUv;
                    
                    void main() {
                        vec2 p = vUv;
                        float distortion = sin(p.y * 10.0 + time) * 
                            intensity * 0.01;
                        vec4 color = texture2D(tDiffuse, 
                            vec2(p.x + distortion, p.y));
                        gl_FragColor = color;
                    }
                `
            }
        };
    }

    setupEffects() {
        // Bloom effect
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.composer.addPass(bloomPass);
        this.effects.set('bloom', bloomPass);

        // Custom distortion effect
        const distortionPass = new THREE.ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                intensity: { value: 1.0 }
            },
            vertexShader: this.shaders.distortion.vertex,
            fragmentShader: this.shaders.distortion.fragment
        });
        this.composer.addPass(distortionPass);
        this.effects.set('distortion', distortionPass);

        // FXAA
        const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        fxaaPass.material.uniforms.resolution.value.x = 1 / window.innerWidth;
        fxaaPass.material.uniforms.resolution.value.y = 1 / window.innerHeight;
        this.composer.addPass(fxaaPass);
        this.effects.set('fxaa', fxaaPass);
    }

    createGlowEffect(object, color, intensity = 1.0) {
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(color) },
                intensity: { value: intensity }
            },
            vertexShader: this.shaders.glow.vertex,
            fragmentShader: this.shaders.glow.fragment,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const scale = 1.1;
        const glowMesh = new THREE.Mesh(
            object.geometry.clone(),
            glowMaterial
        );
        glowMesh.scale.multiplyScalar(scale);
        object.add(glowMesh);

        return glowMesh;
    }

    createTrailEffect(object, color) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(1000 * 3);
        const colors = new Float32Array(1000 * 3);
        const sizes = new Float32Array(1000);

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', 
            new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', 
            new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { 
                    value: new THREE.TextureLoader().load('trail.png') 
                }
            },
            vertexShader: this.shaders.trail.vertex,
            fragmentShader: this.shaders.trail.fragment,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        const trail = new THREE.Points(geometry, material);
        this.game.scene.add(trail);

        return {
            mesh: trail,
            update: (position) => {
                this.updateTrail(trail, position, color);
            }
        };
    }

    updateTrail(trail, position, color) {
        const positions = trail.geometry.attributes.position.array;
        const colors = trail.geometry.attributes.customColor.array;
        const sizes = trail.geometry.attributes.size.array;

        // Shift positions
        for (let i = positions.length - 3; i >= 3; i -= 3) {
            positions[i] = positions[i - 3];
            positions[i + 1] = positions[i - 2];
            positions[i + 2] = positions[i - 1];

            colors[i] = colors[i - 3];
            colors[i + 1] = colors[i - 2];
            colors[i + 2] = colors[i - 1];

            sizes[i / 3] = sizes[i / 3 - 1] * 0.96;
        }

        // Add new position
        positions[0] = position.x;
        positions[1] = position.y;
        positions[2] = position.z;

        const c = new THREE.Color(color);
        colors[0] = c.r;
        colors[1] = c.g;
        colors[2] = c.b;

        sizes[0] = 20;

        trail.geometry.attributes.position.needsUpdate = true;
        trail.geometry.attributes.customColor.needsUpdate = true;
        trail.geometry.attributes.size.needsUpdate = true;
    }

    createExplosionEffect(position, color) {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            const velocity = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize().multiplyScalar(Math.random() * 10);

            velocities[i3] = velocity.x;
            velocities[i3 + 1] = velocity.y;
            velocities[i3 + 2] = velocity.z;

            const c = new THREE.Color(color);
            colors[i3] = c.r;
            colors[i3 + 1] = c.g;
            colors[i3 + 2] = c.b;
        }

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', 
            new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('color', 
            new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        const particles = new THREE.Points(geometry, material);
        this.game.scene.add(particles);

        return {
            mesh: particles,
            update: (deltaTime) => {
                this.updateExplosion(particles, deltaTime);
            },
            lifetime: 2.0
        };
    }

    updateExplosion(particles, deltaTime) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;

            // Add gravity
            velocities[i + 1] -= 9.8 * deltaTime;
        }

        particles.geometry.attributes.position.needsUpdate = true;
    }

    update(deltaTime) {
        // Update distortion effect
        const distortionPass = this.effects.get('distortion');
        if (distortionPass) {
            distortionPass.uniforms.time.value += deltaTime;
        }

        // Update active effects
        this.activeEffects?.forEach((effect, key) => {
            if (effect.update) {
                effect.update(deltaTime);
            }

            if (effect.lifetime) {
                effect.lifetime -= deltaTime;
                if (effect.lifetime <= 0) {
                    this.removeEffect(key);
                }
            }
        });

        // Render with post-processing
        this.composer.render();
    }

    resize(width, height) {
        this.composer.setSize(width, height);

        // Update FXAA resolution
        const fxaaPass = this.effects.get('fxaa');
        if (fxaaPass) {
            fxaaPass.material.uniforms.resolution.value.x = 1 / width;
            fxaaPass.material.uniforms.resolution.value.y = 1 / height;
        }
    }

    removeEffect(key) {
        const effect = this.activeEffects?.get(key);
        if (effect) {
            if (effect.mesh) {
                this.game.scene.remove(effect.mesh);
            }
            this.activeEffects.delete(key);
        }
    }

    cleanup() {
        this.activeEffects?.forEach((effect, key) => {
            this.removeEffect(key);
        });
        this.effects.clear();
    }
} 
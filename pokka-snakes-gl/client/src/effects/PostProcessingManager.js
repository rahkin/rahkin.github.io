export class PostProcessingManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.composer = new THREE.EffectComposer(renderer);
        this.effects = new Map();
        this.passes = new Map();
        
        this.setupBasicPasses();
        this.setupEffects();
    }

    setupBasicPasses() {
        // Render pass
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        this.passes.set('render', renderPass);

        // Output pass
        const outputPass = new THREE.ShaderPass(THREE.CopyShader);
        outputPass.renderToScreen = true;
        this.composer.addPass(outputPass);
        this.passes.set('output', outputPass);
    }

    setupEffects() {
        // Bloom effect
        this.addEffect('bloom', {
            pass: new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                1.5, 0.4, 0.85
            ),
            enabled: false,
            params: {
                threshold: 0.4,
                strength: 1.5,
                radius: 0.85
            }
        });

        // Film grain effect
        this.addEffect('film', {
            pass: new THREE.FilmPass(
                0.35,    // noise intensity
                0.025,   // scanline intensity
                648,     // scanline count
                false    // grayscale
            ),
            enabled: false,
            params: {
                noiseIntensity: 0.35,
                scanlineIntensity: 0.025,
                scanlineCount: 648
            }
        });

        // Color correction
        this.addEffect('colorCorrection', {
            pass: new THREE.ShaderPass(THREE.ColorCorrectionShader),
            enabled: false,
            params: {
                powRGB: new THREE.Vector3(1, 1, 1),
                mulRGB: new THREE.Vector3(1, 1, 1)
            }
        });

        // Motion blur
        this.addEffect('motionBlur', {
            pass: new THREE.ShaderPass(THREE.MotionBlurShader),
            enabled: false,
            params: {
                velocityFactor: 1.0
            }
        });

        // Glitch effect
        this.addEffect('glitch', {
            pass: new THREE.GlitchPass(),
            enabled: false,
            params: {
                goWild: false,
                amount: 1.0
            }
        });

        // Custom effects
        this.addCustomEffects();
    }

    addCustomEffects() {
        // Chromatic aberration
        const chromaticAberrationShader = {
            uniforms: {
                tDiffuse: { value: null },
                amount: { value: 1.0 },
                angle: { value: 0.0 }
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
                uniform float amount;
                uniform float angle;
                varying vec2 vUv;

                void main() {
                    vec2 offset = amount * vec2(cos(angle), sin(angle));
                    vec4 cr = texture2D(tDiffuse, vUv + offset);
                    vec4 cg = texture2D(tDiffuse, vUv);
                    vec4 cb = texture2D(tDiffuse, vUv - offset);
                    gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
                }
            `
        };

        this.addEffect('chromaticAberration', {
            pass: new THREE.ShaderPass(chromaticAberrationShader),
            enabled: false,
            params: {
                amount: 0.005,
                angle: 0.0
            }
        });

        // Vignette effect
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: 1.0 },
                darkness: { value: 1.0 }
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
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    vec2 center = vec2(0.5);
                    float dist = length(vUv - center) * offset;
                    texel.rgb *= smoothstep(1.0, darkness, dist);
                    gl_FragColor = texel;
                }
            `
        };

        this.addEffect('vignette', {
            pass: new THREE.ShaderPass(vignetteShader),
            enabled: false,
            params: {
                offset: 1.0,
                darkness: 1.0
            }
        });
    }

    addEffect(name, effect) {
        this.effects.set(name, effect);
        if (effect.enabled) {
            this.composer.addPass(effect.pass);
        }
    }

    enableEffect(name) {
        const effect = this.effects.get(name);
        if (effect && !effect.enabled) {
            effect.enabled = true;
            this.composer.addPass(effect.pass);
        }
    }

    disableEffect(name) {
        const effect = this.effects.get(name);
        if (effect && effect.enabled) {
            effect.enabled = false;
            this.composer.removePass(effect.pass);
        }
    }

    setEffectParameter(effectName, paramName, value) {
        const effect = this.effects.get(effectName);
        if (effect && effect.params[paramName] !== undefined) {
            effect.params[paramName] = value;
            if (effect.pass.uniforms && effect.pass.uniforms[paramName]) {
                effect.pass.uniforms[paramName].value = value;
            }
        }
    }

    createPreset(name, config) {
        const preset = {
            effects: config.effects || {},
            transition: config.transition || 1000
        };

        Object.entries(preset.effects).forEach(([effectName, params]) => {
            if (!this.effects.has(effectName)) {
                console.warn(`Effect ${effectName} not found`);
                return;
            }
            preset.effects[effectName] = {
                enabled: params.enabled !== undefined ? params.enabled : false,
                params: params.params || {}
            };
        });

        return preset;
    }

    applyPreset(preset, duration = 1000) {
        Object.entries(preset.effects).forEach(([effectName, config]) => {
            const effect = this.effects.get(effectName);
            if (!effect) return;

            if (config.enabled) {
                this.enableEffect(effectName);
            } else {
                this.disableEffect(effectName);
            }

            if (config.params) {
                Object.entries(config.params).forEach(([param, value]) => {
                    this.setEffectParameter(effectName, param, value);
                });
            }
        });
    }

    update(deltaTime) {
        this.effects.forEach((effect, name) => {
            if (effect.enabled && effect.pass.update) {
                effect.pass.update(deltaTime);
            }
        });

        this.composer.render(deltaTime);
    }

    resize(width, height) {
        this.composer.setSize(width, height);
        
        this.effects.forEach(effect => {
            if (effect.pass.setSize) {
                effect.pass.setSize(width, height);
            }
        });
    }

    dispose() {
        this.effects.forEach(effect => {
            if (effect.pass.dispose) {
                effect.pass.dispose();
            }
        });
        
        this.composer.dispose();
    }
} 
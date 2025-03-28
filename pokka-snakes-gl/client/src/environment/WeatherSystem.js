export class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.currentWeather = null;
        this.transitionTime = 0;
        this.particles = new Map();
        this.effects = new Map();
        
        this.setupWeatherEffects();
        this.initializeSkybox();
    }

    setupWeatherEffects() {
        this.weatherTypes = {
            clear: {
                fogDensity: 0.001,
                lightIntensity: 1.0,
                ambientColor: 0xffffff,
                particleSystem: null
            },
            rain: {
                fogDensity: 0.03,
                lightIntensity: 0.7,
                ambientColor: 0x666666,
                particleSystem: this.createRainSystem()
            },
            snow: {
                fogDensity: 0.02,
                lightIntensity: 0.8,
                ambientColor: 0xaaaaaa,
                particleSystem: this.createSnowSystem()
            },
            storm: {
                fogDensity: 0.05,
                lightIntensity: 0.4,
                ambientColor: 0x444444,
                particleSystem: this.createStormSystem(),
                lightningEffect: true
            },
            sandstorm: {
                fogDensity: 0.06,
                lightIntensity: 0.6,
                ambientColor: 0xccaa88,
                particleSystem: this.createSandstormSystem()
            }
        };
    }

    createRainSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(10000 * 3);
        const velocities = new Float32Array(10000 * 3);

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = Math.random() * 200 - 100;
            positions[i + 1] = Math.random() * 100 + 50;
            positions[i + 2] = Math.random() * 200 - 100;

            velocities[i] = 0;
            velocities[i + 1] = -20;
            velocities[i + 2] = 0;
        }

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', 
            new THREE.BufferAttribute(velocities, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                attribute vec3 velocity;
                void main() {
                    vec3 pos = position + velocity * time;
                    pos.y = mod(pos.y, 100.0);
                    gl_Position = projectionMatrix * 
                        modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 2.0;
                }
            `,
            fragmentShader: `
                void main() {
                    float r = length(gl_PointCoord - vec2(0.5));
                    if (r > 0.5) discard;
                    gl_FragColor = vec4(0.7, 0.7, 0.9, 1.0 - r * 2.0);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        return new THREE.Points(geometry, material);
    }

    createSnowSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(5000 * 3);
        const velocities = new Float32Array(5000 * 3);
        const rotations = new Float32Array(5000);

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = Math.random() * 200 - 100;
            positions[i + 1] = Math.random() * 100 + 50;
            positions[i + 2] = Math.random() * 200 - 100;

            velocities[i] = Math.random() * 2 - 1;
            velocities[i + 1] = -2 - Math.random() * 2;
            velocities[i + 2] = Math.random() * 2 - 1;

            rotations[i / 3] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', 
            new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('rotation', 
            new THREE.BufferAttribute(rotations, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                attribute vec3 velocity;
                attribute float rotation;
                varying float vRotation;
                void main() {
                    vec3 pos = position + velocity * time;
                    pos.y = mod(pos.y, 100.0);
                    vRotation = rotation + time;
                    gl_Position = projectionMatrix * 
                        modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 3.0;
                }
            `,
            fragmentShader: `
                varying float vRotation;
                void main() {
                    vec2 rotated = vec2(
                        gl_PointCoord.x * cos(vRotation) - 
                            gl_PointCoord.y * sin(vRotation),
                        gl_PointCoord.x * sin(vRotation) + 
                            gl_PointCoord.y * cos(vRotation)
                    );
                    float r = length(rotated - vec2(0.5));
                    if (r > 0.5) discard;
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.8 - r);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        return new THREE.Points(geometry, material);
    }

    createStormSystem() {
        const system = this.createRainSystem();
        system.material.uniforms.intensity = { value: 1.0 };
        system.material.vertexShader = system.material.vertexShader.replace(
            'void main()',
            `
            uniform float intensity;
            void main()
            `
        );
        return system;
    }

    createSandstormSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(20000 * 3);
        const velocities = new Float32Array(20000 * 3);
        const sizes = new Float32Array(20000);

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = Math.random() * 200 - 100;
            positions[i + 1] = Math.random() * 100;
            positions[i + 2] = Math.random() * 200 - 100;

            velocities[i] = 10 + Math.random() * 5;
            velocities[i + 1] = Math.random() * 2 - 1;
            velocities[i + 2] = Math.random() * 2 - 1;

            sizes[i / 3] = Math.random() * 2 + 1;
        }

        geometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', 
            new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('size', 
            new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                attribute vec3 velocity;
                attribute float size;
                void main() {
                    vec3 pos = position + velocity * time;
                    pos.x = mod(pos.x, 200.0) - 100.0;
                    gl_Position = projectionMatrix * 
                        modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size;
                }
            `,
            fragmentShader: `
                void main() {
                    float r = length(gl_PointCoord - vec2(0.5));
                    if (r > 0.5) discard;
                    gl_FragColor = vec4(0.76, 0.69, 0.57, 0.3 - r);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        return new THREE.Points(geometry, material);
    }

    initializeSkybox() {
        const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const materials = new Array(6).fill(null).map(() => 
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                fog: true
            })
        );
        this.skybox = new THREE.Mesh(geometry, materials);
        this.game.scene.add(this.skybox);
    }

    setWeather(type, transitionDuration = 2.0) {
        if (!this.weatherTypes[type]) return;

        const oldWeather = this.currentWeather;
        const newWeather = this.weatherTypes[type];

        this.currentWeather = newWeather;
        this.transitionTime = transitionDuration;

        // Start transition
        this.startWeatherTransition(oldWeather, newWeather, transitionDuration);
    }

    startWeatherTransition(oldWeather, newWeather, duration) {
        if (oldWeather?.particleSystem) {
            this.fadeOutParticleSystem(oldWeather.particleSystem, duration);
        }

        if (newWeather.particleSystem) {
            this.game.scene.add(newWeather.particleSystem);
            this.fadeInParticleSystem(newWeather.particleSystem, duration);
        }

        // Transition fog
        const fogTransition = {
            value: this.game.scene.fog.density
        };
        new TWEEN.Tween(fogTransition)
            .to({ value: newWeather.fogDensity }, duration * 1000)
            .onUpdate(() => {
                this.game.scene.fog.density = fogTransition.value;
            })
            .start();

        // Transition lighting
        const lightTransition = {
            intensity: this.game.lights.directional.intensity,
            color: this.game.lights.ambient.color.getHex()
        };
        new TWEEN.Tween(lightTransition)
            .to({
                intensity: newWeather.lightIntensity,
                color: newWeather.ambientColor
            }, duration * 1000)
            .onUpdate(() => {
                this.game.lights.directional.intensity = 
                    lightTransition.intensity;
                this.game.lights.ambient.color.setHex(
                    lightTransition.color);
            })
            .start();
    }

    fadeInParticleSystem(system, duration) {
        system.material.opacity = 0;
        new TWEEN.Tween(system.material)
            .to({ opacity: 1 }, duration * 1000)
            .start();
    }

    fadeOutParticleSystem(system, duration) {
        new TWEEN.Tween(system.material)
            .to({ opacity: 0 }, duration * 1000)
            .onComplete(() => {
                this.game.scene.remove(system);
            })
            .start();
    }

    createLightning() {
        const geometry = new THREE.BufferGeometry();
        const points = this.generateLightningPoints();
        geometry.setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });

        const lightning = new THREE.Line(geometry, material);
        this.game.scene.add(lightning);

        // Animate lightning
        new TWEEN.Tween(material)
            .to({ opacity: 0 }, 200)
            .onComplete(() => {
                this.game.scene.remove(lightning);
            })
            .start();

        // Add thunder sound with delay
        setTimeout(() => {
            this.game.audio.playSound('thunder');
        }, Math.random() * 1000 + 500);
    }

    generateLightningPoints() {
        const points = [];
        const origin = new THREE.Vector3(
            Math.random() * 200 - 100,
            100,
            Math.random() * 200 - 100
        );
        points.push(origin);

        let currentPoint = origin.clone();
        const target = new THREE.Vector3(
            origin.x + Math.random() * 40 - 20,
            0,
            origin.z + Math.random() * 40 - 20
        );

        for (let i = 0; i < 10; i++) {
            const direction = target.clone()
                .sub(currentPoint)
                .normalize();
            const deviation = new THREE.Vector3(
                Math.random() * 4 - 2,
                0,
                Math.random() * 4 - 2
            );
            currentPoint.add(direction.multiplyScalar(10))
                .add(deviation);
            points.push(currentPoint.clone());
        }

        return points;
    }

    update(deltaTime) {
        if (!this.currentWeather) return;

        // Update particle systems
        if (this.currentWeather.particleSystem) {
            this.currentWeather.particleSystem.material.uniforms.time.value += 
                deltaTime;
        }

        // Generate lightning in storm weather
        if (this.currentWeather.lightningEffect && 
            Math.random() < deltaTime * 0.1) {
            this.createLightning();
        }

        // Update transitions
        TWEEN.update();
    }

    cleanup() {
        this.particles.forEach(system => {
            this.game.scene.remove(system);
        });
        this.particles.clear();
        this.game.scene.remove(this.skybox);
    }
} 
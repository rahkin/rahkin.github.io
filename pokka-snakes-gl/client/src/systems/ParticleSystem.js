export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.activeEffects = new Map();
        this.particleGroups = new Map();
        
        this.setupParticleGroups();
    }

    setupParticleGroups() {
        // Speed Trail
        this.registerParticleGroup('speedTrail', {
            particleCount: 100,
            texture: 'particle_speed.png',
            blending: THREE.AdditiveBlending,
            properties: {
                position: {
                    spread: new THREE.Vector3(0.5, 0.5, 0.5),
                    randomize: true
                },
                velocity: {
                    value: new THREE.Vector3(0, 0, -10),
                    spread: new THREE.Vector3(5, 5, 5)
                },
                color: {
                    value: new THREE.Color(0xffff00),
                    spread: new THREE.Vector3(0.2, 0.2, 0)
                },
                size: {
                    value: 2,
                    spread: 1
                },
                opacity: {
                    value: 1,
                    spread: 0.2
                },
                lifetime: {
                    value: 0.5
                }
            }
        });

        // Ghost Trail
        this.registerParticleGroup('ghostTrail', {
            particleCount: 50,
            texture: 'particle_ghost.png',
            blending: THREE.AdditiveBlending,
            properties: {
                position: {
                    spread: new THREE.Vector3(0.3, 0.3, 0.3)
                },
                velocity: {
                    value: new THREE.Vector3(0, 0, -10),
                    spread: new THREE.Vector3(5, 5, 5)
                },
                color: {
                    value: new THREE.Color(0x88ffff),
                    spread: new THREE.Vector3(0.2, 0.2, 0)
                },
                size: {
                    value: 2,
                    spread: 1
                },
                opacity: {
                    value: 1,
                    spread: 0.2
                },
                lifetime: {
                    value: 0.5
                }
            }
        });
    }

    registerParticleGroup(type, config) {
        this.particleGroups.set(type, config);
    }

    createEffect(type, position) {
        const config = this.particleGroups.get(type);
        if (!config) return;

        const effect = new THREE.Mesh(
            new THREE.SphereGeometry(config.properties.size.value, 16, 16),
            new THREE.MeshBasicMaterial({
                color: config.properties.color.value,
                transparent: true,
                opacity: config.properties.opacity.value
            })
        );
        effect.position.copy(position);
        effect.scale.multiplyScalar(config.properties.size.spread);
        this.game.scene.add(effect);

        this.activeEffects.set(type, {
            effect,
            position: position.clone(),
            config,
            endTime: Date.now() + config.properties.lifetime.value * 1000
        });
    }

    removeEffect(type, position) {
        const effect = this.activeEffects.get(type);
        if (effect) {
            this.game.scene.remove(effect.effect);
            this.activeEffects.delete(type);
        }
    }

    update(deltaTime) {
        const now = Date.now();

        this.activeEffects.forEach((effect, type) => {
            if (now >= effect.endTime) {
                this.removeEffect(type, effect.position);
            }
        });
    }
} 
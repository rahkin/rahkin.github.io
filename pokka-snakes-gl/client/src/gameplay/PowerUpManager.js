import * as THREE from 'three';

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = new Set();
        this.types = {
            SPEED: {
                duration: 5,
                effect: (snake) => {
                    snake.setSpeedMultiplier(1.5);
                },
                revert: (snake) => {
                    snake.setSpeedMultiplier(1);
                }
            },
            SHIELD: {
                duration: 3,
                effect: (snake) => {
                    snake.setInvulnerable(true);
                },
                revert: (snake) => {
                    snake.setInvulnerable(false);
                }
            },
            MAGNET: {
                duration: 4,
                effect: (snake) => {
                    snake.setPelletAttraction(true);
                },
                revert: (snake) => {
                    snake.setPelletAttraction(false);
                }
            }
        };

        this.spawnTimer = 0;
        this.spawnInterval = 10; // seconds
        this.initGeometry();
    }

    initGeometry() {
        this.geometries = {
            SPEED: new THREE.OctahedronGeometry(5),
            SHIELD: new THREE.SphereGeometry(5),
            MAGNET: new THREE.TorusGeometry(5, 2, 16, 32)
        };

        this.materials = {
            SPEED: new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 0.5
            }),
            SHIELD: new THREE.MeshPhongMaterial({
                color: 0x0000ff,
                emissive: 0x0000ff,
                emissiveIntensity: 0.5
            }),
            MAGNET: new THREE.MeshPhongMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.5
            })
        };
    }

    update(delta) {
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnRandomPowerUp();
            this.spawnTimer = 0;
        }

        // Update power-ups
        this.powerUps.forEach(powerUp => {
            powerUp.mesh.rotation.z += delta * 2;
            powerUp.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.1;
        });
    }

    spawnRandomPowerUp() {
        const types = Object.keys(this.types);
        const type = types[Math.floor(Math.random() * types.length)];
        const position = this.game.world.getRandomPosition();

        const powerUp = {
            type: type,
            position: position,
            mesh: new THREE.Mesh(
                this.geometries[type],
                this.materials[type]
            )
        };

        powerUp.mesh.position.set(position.x, position.y, 0);
        this.game.scene.add(powerUp.mesh);
        this.powerUps.add(powerUp);
    }

    collect(snake, powerUp) {
        const type = this.types[powerUp.type];
        
        // Apply effect
        type.effect(snake);
        
        // Create collection effect
        this.game.effects.createPowerUpEffect(powerUp.position, powerUp.type);
        
        // Remove power-up
        this.game.scene.remove(powerUp.mesh);
        this.powerUps.delete(powerUp);

        // Schedule revert
        setTimeout(() => {
            type.revert(snake);
        }, type.duration * 1000);
    }

    checkCollisions(snake) {
        this.powerUps.forEach(powerUp => {
            const distance = snake.position.distanceTo(powerUp.position);
            if (distance < snake.segmentRadius + 5) {
                this.collect(snake, powerUp);
            }
        });
    }

    clear() {
        this.powerUps.forEach(powerUp => {
            this.game.scene.remove(powerUp.mesh);
        });
        this.powerUps.clear();
    }
} 
import * as THREE from 'three';

export class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.powerUps = new Map();
        this.activePowerUps = new Map();
        this.powerUpTypes = {
            SPEED_BOOST: 'Speed Boost',
            GHOST_MODE: 'Ghost Mode',
            SIZE_MULTIPLIER: 'Size Multiplier'
        };
        
        this.initializePowerUps();
    }

    initializePowerUps() {
        // Define power-up properties
        this.powerUps.set(this.powerUpTypes.SPEED_BOOST, {
            duration: 5000, // 5 seconds
            effect: (snake) => {
                snake.speed *= 1.5;
                return () => {
                    snake.speed /= 1.5;
                };
            }
        });

        this.powerUps.set(this.powerUpTypes.GHOST_MODE, {
            duration: 3000, // 3 seconds
            effect: (snake) => {
                snake.isGhost = true;
                return () => {
                    snake.isGhost = false;
                };
            }
        });

        this.powerUps.set(this.powerUpTypes.SIZE_MULTIPLIER, {
            duration: 4000, // 4 seconds
            effect: (snake) => {
                snake.scale.multiplyScalar(1.5);
                return () => {
                    snake.scale.divideScalar(1.5);
                };
            }
        });
    }

    spawnPowerUp(position) {
        const powerUpTypes = Object.values(this.powerUpTypes);
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: this.getPowerUpColor(randomType),
            emissive: this.getPowerUpColor(randomType),
            emissiveIntensity: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.userData.powerUpType = randomType;
        
        this.game.scene.add(mesh);
        return mesh;
    }

    getPowerUpColor(type) {
        switch(type) {
            case this.powerUpTypes.SPEED_BOOST:
                return 0xff0000; // Red
            case this.powerUpTypes.GHOST_MODE:
                return 0x00ffff; // Cyan
            case this.powerUpTypes.SIZE_MULTIPLIER:
                return 0xffff00; // Yellow
            default:
                return 0xffffff; // White
        }
    }

    activatePowerUp(type, snake) {
        const powerUp = this.powerUps.get(type);
        if (!powerUp) return;

        const cleanup = powerUp.effect(snake);
        this.activePowerUps.set(type, {
            cleanup,
            endTime: Date.now() + powerUp.duration
        });

        // Update HUD
        if (this.game.hud) {
            this.game.hud.addPowerUp(type);
        }

        // Remove power-up after duration
        setTimeout(() => {
            this.deactivatePowerUp(type);
        }, powerUp.duration);
    }

    deactivatePowerUp(type) {
        const activePowerUp = this.activePowerUps.get(type);
        if (activePowerUp) {
            activePowerUp.cleanup();
            this.activePowerUps.delete(type);
            
            // Update HUD
            if (this.game.hud) {
                this.game.hud.removePowerUp(type);
            }
        }
    }

    update() {
        // Check for expired power-ups
        const now = Date.now();
        for (const [type, powerUp] of this.activePowerUps.entries()) {
            if (now >= powerUp.endTime) {
                this.deactivatePowerUp(type);
            }
        }
    }
} 
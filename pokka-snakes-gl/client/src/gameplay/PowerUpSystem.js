export class PowerUpSystem {
    static Types = {
        SPEED_BOOST: {
            id: 'speed',
            name: 'Speed Boost',
            icon: '⚡',
            color: 0xffff00,
            duration: 5000,
            effect: (snake) => {
                snake.setSpeed(snake.speed * 1.5);
                return () => snake.setSpeed(snake.baseSpeed);
            }
        },
        TIME_SLOW: {
            id: 'time',
            name: 'Time Warp',
            icon: '⌛',
            color: 0x00ffff,
            duration: 4000,
            effect: (snake) => {
                snake.setTimeScale(0.5);
                return () => snake.setTimeScale(1.0);
            }
        },
        GHOST: {
            id: 'ghost',
            name: 'Ghost Mode',
            icon: '👻',
            color: 0xff00ff,
            duration: 3000,
            effect: (snake) => {
                snake.setGhostMode(true);
                return () => snake.setGhostMode(false);
            }
        },
        MAGNET: {
            id: 'magnet',
            name: 'Pellet Magnet',
            icon: '🧲',
            color: 0xff8800,
            duration: 6000,
            effect: (snake) => {
                snake.setMagnetMode(true);
                return () => snake.setMagnetMode(false);
            }
        },
        MULTIPLIER: {
            id: 'multiplier',
            name: 'Score Multiplier',
            icon: '✨',
            color: 0x00ff00,
            duration: 8000,
            effect: (snake) => {
                snake.setScoreMultiplier(2);
                return () => snake.setScoreMultiplier(1);
            }
        }
    };

    constructor(scene) {
        this.scene = scene;
        this.activePowerUps = new Map();
        this.powerUpPool = new ObjectPool(() => this.createPowerUpMesh());
    }

    createPowerUpMesh() {
        const geometry = new THREE.OctahedronGeometry(0.5, 2);
        const material = new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });
        return new THREE.Mesh(geometry, material);
    }

    spawnPowerUp(position, type) {
        const mesh = this.powerUpPool.get();
        mesh.material.color.setHex(type.color);
        mesh.position.copy(position);
        mesh.powerUpType = type;
        
        // Add floating animation
        const startY = position.y;
        mesh.userData.animation = {
            update: (time) => {
                mesh.position.y = startY + Math.sin(time * 2) * 0.2;
                mesh.rotation.y += 0.02;
            }
        };

        this.scene.add(mesh);
        return mesh;
    }

    activatePowerUp(snake, powerUp) {
        const type = powerUp.powerUpType;
        
        // Remove existing power-up of same type
        if (this.activePowerUps.has(type.id)) {
            this.deactivatePowerUp(type.id);
        }

        // Apply effect and store cleanup function
        const cleanup = type.effect(snake);
        
        // Store power-up info
        this.activePowerUps.set(type.id, {
            type,
            cleanup,
            timer: setTimeout(() => {
                this.deactivatePowerUp(type.id);
            }, type.duration)
        });

        // Remove power-up mesh
        this.powerUpPool.release(powerUp);
        this.scene.remove(powerUp);

        // Trigger visual effect
        this.createActivationEffect(powerUp.position, type.color);
    }

    deactivatePowerUp(typeId) {
        const powerUp = this.activePowerUps.get(typeId);
        if (powerUp) {
            clearTimeout(powerUp.timer);
            powerUp.cleanup();
            this.activePowerUps.delete(typeId);
        }
    }

    createActivationEffect(position, color) {
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color,
                size: 0.2,
                transparent: true
            })
        );

        // Add particle effect
        // ... (particle effect implementation)
    }

    update(time) {
        // Update floating animations
        this.scene.traverse((object) => {
            if (object.userData.animation) {
                object.userData.animation.update(time);
            }
        });
    }

    clear() {
        // Clear all active power-ups
        this.activePowerUps.forEach((powerUp, typeId) => {
            this.deactivatePowerUp(typeId);
        });
    }
} 
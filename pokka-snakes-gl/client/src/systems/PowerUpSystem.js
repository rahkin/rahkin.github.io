import * as THREE from 'three';

export class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.powerUps = new Map();
        this.activePowerUps = new Map();
        this.powerUpTypes = {
            SPEED_BOOST: 'Speed Boost',
            GHOST_MODE: 'Ghost Mode',
            SIZE_MULTIPLIER: 'Size Multiplier',
            INVINCIBILITY: 'Invincibility',
            POINT_MULTIPLIER: 'Point Multiplier',
            TIME_SLOW: 'Time Slow',
            RAINBOW_TRAIL: 'Rainbow Trail',
            MAGNET: 'Magnet'
        };
        
        this.spawnTimer = 0;
        this.spawnInterval = 5000; // Spawn a power-up every 5 seconds
        this.powerUpMeshes = new Set();
        
        this.initializePowerUps();
        this.initializeParticleSystems();
    }

    initializePowerUps() {
        // Speed Boost
        this.powerUps.set(this.powerUpTypes.SPEED_BOOST, {
            duration: 5000,
            stackable: true,
            effect: (snake) => {
                snake.speed *= 1.5;
                this.createPowerUpEffect(snake, 0xff0000);
                return () => {
                    snake.speed /= 1.5;
                };
            }
        });

        // Ghost Mode
        this.powerUps.set(this.powerUpTypes.GHOST_MODE, {
            duration: 3000,
            stackable: false,
            effect: (snake) => {
                snake.isGhost = true;
                snake.material.transparent = true;
                snake.material.opacity = 0.5;
                this.createPowerUpEffect(snake, 0x00ffff);
                return () => {
                    snake.isGhost = false;
                    snake.material.transparent = false;
                    snake.material.opacity = 1;
                };
            }
        });

        // Size Multiplier
        this.powerUps.set(this.powerUpTypes.SIZE_MULTIPLIER, {
            duration: 4000,
            stackable: true,
            effect: (snake) => {
                snake.scale.multiplyScalar(1.5);
                this.createPowerUpEffect(snake, 0xffff00);
                return () => {
                    snake.scale.divideScalar(1.5);
                };
            }
        });

        // Invincibility
        this.powerUps.set(this.powerUpTypes.INVINCIBILITY, {
            duration: 6000,
            stackable: false,
            effect: (snake) => {
                snake.isInvincible = true;
                const originalMaterial = snake.material.clone();
                snake.material = new THREE.MeshPhongMaterial({
                    color: 0xffd700,
                    emissive: 0xffd700,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.8
                });
                this.createPowerUpEffect(snake, 0xffd700);
                return () => {
                    snake.isInvincible = false;
                    snake.material = originalMaterial;
                };
            }
        });

        // Point Multiplier
        this.powerUps.set(this.powerUpTypes.POINT_MULTIPLIER, {
            duration: 8000,
            stackable: true,
            effect: (snake) => {
                snake.pointMultiplier = (snake.pointMultiplier || 1) * 2;
                this.createPowerUpEffect(snake, 0xff00ff);
                return () => {
                    snake.pointMultiplier = (snake.pointMultiplier || 2) / 2;
                };
            }
        });

        // Time Slow
        this.powerUps.set(this.powerUpTypes.TIME_SLOW, {
            duration: 5000,
            stackable: false,
            effect: (snake) => {
                this.game.timeScale = 0.5;
                this.createPowerUpEffect(snake, 0x0000ff);
                return () => {
                    this.game.timeScale = 1;
                };
            }
        });

        // Rainbow Trail
        this.powerUps.set(this.powerUpTypes.RAINBOW_TRAIL, {
            duration: 10000,
            stackable: false,
            effect: (snake) => {
                snake.hasRainbowTrail = true;
                const hue = { value: 0 };
                const updateTrail = () => {
                    hue.value = (hue.value + 0.01) % 1;
                    snake.material.color.setHSL(hue.value, 1, 0.5);
                    if (snake.hasRainbowTrail) {
                        requestAnimationFrame(updateTrail);
                    }
                };
                updateTrail();
                this.createPowerUpEffect(snake, 0xff00ff);
                return () => {
                    snake.hasRainbowTrail = false;
                    snake.material.color.setHex(0x00ff00); // Reset to default color
                };
            }
        });

        // Magnet
        this.powerUps.set(this.powerUpTypes.MAGNET, {
            duration: 7000,
            stackable: false,
            effect: (snake) => {
                snake.hasMagnet = true;
                this.createPowerUpEffect(snake, 0x808080);
                return () => {
                    snake.hasMagnet = false;
                };
            }
        });
    }

    initializeParticleSystems() {
        // Create particle system for power-up collection effects
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });

        this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.game.scene.add(this.particleSystem);
        this.particleSystem.visible = false;
    }

    createPowerUpEffect(snake, color) {
        // Create visual effect when power-up is activated
        const positions = this.particleSystem.geometry.attributes.position.array;
        const colors = this.particleSystem.geometry.attributes.color.array;
        const colorObj = new THREE.Color(color);

        for (let i = 0; i < positions.length; i += 3) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2;
            positions[i] = snake.position.x + Math.cos(angle) * radius;
            positions[i + 1] = snake.position.y;
            positions[i + 2] = snake.position.z + Math.sin(angle) * radius;
            colors[i] = colorObj.r;
            colors[i + 1] = colorObj.g;
            colors[i + 2] = colorObj.b;
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
        this.particleSystem.visible = true;

        setTimeout(() => {
            this.particleSystem.visible = false;
        }, 1000);
    }

    spawnPowerUp(position) {
        const powerUpTypes = Object.values(this.powerUpTypes);
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: this.getPowerUpColor(randomType),
            emissive: this.getPowerUpColor(randomType),
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.userData.powerUpType = randomType;
        mesh.userData.spawnTime = Date.now();
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.getPowerUpColor(randomType),
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glowMesh);
        
        this.game.scene.add(mesh);
        this.powerUpMeshes.add(mesh);
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
            case this.powerUpTypes.INVINCIBILITY:
                return 0xffd700; // Gold
            case this.powerUpTypes.POINT_MULTIPLIER:
                return 0xff00ff; // Magenta
            case this.powerUpTypes.TIME_SLOW:
                return 0x0000ff; // Blue
            case this.powerUpTypes.RAINBOW_TRAIL:
                return 0xff69b4; // Hot Pink
            case this.powerUpTypes.MAGNET:
                return 0x808080; // Gray
            default:
                return 0xffffff; // White
        }
    }

    activatePowerUp(type, snake) {
        const powerUp = this.powerUps.get(type);
        if (!powerUp) return;

        // Check if power-up is already active
        const existingPowerUp = this.activePowerUps.get(type);
        if (existingPowerUp) {
            if (powerUp.stackable) {
                // Extend duration for stackable power-ups
                existingPowerUp.endTime = Math.max(
                    existingPowerUp.endTime,
                    Date.now() + powerUp.duration
                );
                // Update HUD
                if (this.game.hud) {
                    this.game.hud.updatePowerUpDuration(type, existingPowerUp.endTime - Date.now());
                }
                return;
            } else {
                // For non-stackable power-ups, deactivate the existing one first
                this.deactivatePowerUp(type);
            }
        }

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

    update(deltaTime) {
        // Update power-up floating animation
        const now = Date.now();
        for (const powerUpMesh of this.powerUpMeshes) {
            const timeSinceSpawn = now - powerUpMesh.userData.spawnTime;
            powerUpMesh.position.y = powerUpMesh.position.y + Math.sin(timeSinceSpawn * 0.003) * 0.001;
            powerUpMesh.rotation.y += deltaTime;
            
            // Update glow effect
            const glowIntensity = 0.3 + Math.sin(timeSinceSpawn * 0.005) * 0.1;
            powerUpMesh.children[0].material.opacity = glowIntensity;
        }

        // Check for expired power-ups
        for (const [type, powerUp] of this.activePowerUps.entries()) {
            if (now >= powerUp.endTime) {
                this.deactivatePowerUp(type);
            }
        }

        // Handle magnet effect
        if (this.game.snake && this.game.snake.hasMagnet) {
            const magnetRange = 10;
            for (const pellet of this.game.pellets) {
                const distance = this.game.snake.position.distanceTo(pellet.position);
                if (distance < magnetRange) {
                    const direction = new THREE.Vector3()
                        .subVectors(this.game.snake.position, pellet.position)
                        .normalize();
                    pellet.position.add(direction.multiplyScalar(deltaTime * 5));
                }
            }
        }
    }
} 
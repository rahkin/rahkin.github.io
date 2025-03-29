import * as THREE from 'three';

export class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.isActive = false;
        this.activePowerUps = new Map();
        this.powerUpTypes = {
            ghost: {
                duration: 5,
                effect: this.activateGhostMode.bind(this)
            },
            speedBoost: {
                duration: 3,
                effect: this.activateSpeedBoost.bind(this)
            }
        };
        this.powerUpDurations = {
            ghost: 5000,    // 5 seconds
            timeSlow: 8000, // 8 seconds
            magnet: 10000,  // 10 seconds
            shield: 7000    // 7 seconds
        };
        this.magnetRadius = 15; // Radius for magnet effect
        this.timeSlowFactor = 0.5; // Time slow factor (0.5 = half speed)
        this.magnetActive = false;
    }

    start() {
        console.log('PowerUpSystem: Starting system');
        this.isActive = true;
        this.spawnPowerUp();
    }

    stop() {
        console.log('PowerUpSystem: Stopping system');
        this.isActive = false;
        this.clearActivePowerUps();
        this.clearPowerUps();
    }

    cleanup() {
        console.log('PowerUpSystem: Cleaning up system');
        this.stop();
        
        // Clean up any remaining power-up effects
        if (this.ghostAura) {
            this.removeGhostEffect();
        }
        
        if (this.shieldMesh) {
            this.deactivateShield();
        }
        
        // Clear all arrays and maps
        this.powerUps = [];
        this.activePowerUps.clear();
        this.magnetActive = false;
    }

    reset() {
        console.log('PowerUpSystem: Resetting system');
        this.stop();
        this.powerUps = [];
        this.activePowerUps = new Map();
    }

    clearActivePowerUps() {
        console.log('PowerUpSystem: Clearing active power-ups');
        for (const [type, powerUp] of this.activePowerUps) {
            this.deactivatePowerUp(type);
        }
        this.activePowerUps.clear();
    }

    clearPowerUps() {
        console.log('PowerUpSystem: Clearing power-up objects');
        this.powerUps.forEach(powerUp => {
            if (powerUp.mesh) {
                this.game.scene.remove(powerUp.mesh);
                powerUp.mesh.geometry.dispose();
                powerUp.mesh.material.dispose();
            }
        });
        this.powerUps = [];
    }

    activatePowerUp(type) {
        // Deactivate any existing power-up of the same type
        this.deactivatePowerUp(type);

        // Activate the new power-up
        switch (type) {
            case 'ghost':
                this.activateGhostMode();
                break;
            case 'timeSlow':
                this.activateTimeSlow();
                break;
            case 'magnet':
                this.activateMagnet();
                break;
            case 'shield':
                this.activateShield();
                break;
        }

        // Store the power-up with its duration
        this.activePowerUps.set(type, {
            startTime: performance.now(),
            duration: this.powerUpDurations[type]
        });

        // Visual feedback
        this.showPowerUpEffect(type);
    }

    deactivatePowerUp(type) {
        if (this.activePowerUps.has(type)) {
            switch (type) {
                case 'ghost':
                    this.deactivateGhostMode();
                    break;
                case 'timeSlow':
                    this.deactivateTimeSlow();
                    break;
                case 'magnet':
                    this.deactivateMagnet();
                    break;
                case 'shield':
                    this.deactivateShield();
                    break;
            }
            this.activePowerUps.delete(type);
        }
    }

    activateGhostMode() {
        if (!this.game.snake) return;
        
        console.log('PowerUpSystem: Activating ghost mode');
        
        // Enable ghost mode on snake
        this.game.snake.setGhostMode(true);
        
        // Add visual effect
        this.createGhostEffect();
        
        // Store cleanup function
        this.activePowerUps.get('ghost').cleanup = () => {
            console.log('PowerUpSystem: Deactivating ghost mode');
            this.game.snake.setGhostMode(false);
            this.removeGhostEffect();
        };
    }

    createGhostEffect() {
        // Create ghost aura effect
        const auraGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const auraMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
            side: THREE.BackSide
        });
        
        this.ghostAura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.ghostAura.position.copy(this.game.snake.head.position);
        this.game.scene.add(this.ghostAura);
        
        // Add pulsing animation
        this.ghostAura.userData.pulseSpeed = 0.003;
        this.ghostAura.userData.pulseScale = 0.2;
    }

    removeGhostEffect() {
        if (this.ghostAura) {
            this.game.scene.remove(this.ghostAura);
            this.ghostAura.geometry.dispose();
            this.ghostAura.material.dispose();
            this.ghostAura = null;
        }
    }

    deactivateGhostMode() {
        if (this.game.snake) {
            // Restore snake opacity
            this.game.snake.group.traverse((child) => {
                if (child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });
        }
    }

    activateTimeSlow() {
        // Slow down game time
        this.game.timeScale = this.timeSlowFactor;
    }

    deactivateTimeSlow() {
        // Restore normal game time
        this.game.timeScale = 1;
    }

    activateMagnet() {
        // Magnet effect is handled in update method
        this.magnetActive = true;
    }

    deactivateMagnet() {
        this.magnetActive = false;
    }

    activateShield() {
        if (this.game.snake) {
            // Add shield visual effect
            const shieldGeometry = new THREE.SphereGeometry(1.5, 32, 32);
            const shieldMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
            this.game.snake.head.add(this.shieldMesh);
        }
    }

    deactivateShield() {
        if (this.shieldMesh) {
            this.shieldMesh.parent.remove(this.shieldMesh);
            this.shieldMesh.geometry.dispose();
            this.shieldMesh.material.dispose();
            this.shieldMesh = null;
        }
    }

    showPowerUpEffect(type) {
        // Create visual effect for power-up activation
        const colors = {
            ghost: 0x808080,    // Gray
            timeSlow: 0x00ffff, // Cyan
            magnet: 0xff00ff,   // Magenta
            shield: 0xffff00    // Yellow
        };

        // Ensure we have a valid color for the power-up type
        const color = colors[type] || 0xffffff; // Default to white if type not found

        if (this.game.snake) {
            const effectGeometry = new THREE.SphereGeometry(2, 32, 32);
            const effectMaterial = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.5
            });
            const effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);
            this.game.snake.head.add(effectMesh);

            // Animate and remove effect
            const duration = 1000; // 1 second
            const startTime = performance.now();
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                    effectMesh.scale.setScalar(1 + progress);
                    effectMesh.material.opacity = 0.5 * (1 - progress);
                    requestAnimationFrame(animate);
                } else {
                    effectMesh.parent.remove(effectMesh);
                    effectMesh.geometry.dispose();
                    effectMesh.material.dispose();
                }
            };
            animate();
        }
    }

    update(deltaTime) {
        // Update active power-ups
        for (const [type, powerUp] of this.activePowerUps) {
            const elapsed = performance.now() - powerUp.startTime;
            
            // Check if power-up duration has expired
            if (elapsed >= powerUp.duration) {
                console.log(`PowerUpSystem: Power-up ${type} expired`);
                this.deactivatePowerUp(type);
            }
            
            // Update ghost aura position if active
            if (type === 'ghost' && this.ghostAura && this.game.snake) {
                this.ghostAura.position.copy(this.game.snake.head.position);
                
                // Update pulse animation
                const scale = 1 + Math.sin(Date.now() * this.ghostAura.userData.pulseSpeed) * 
                    this.ghostAura.userData.pulseScale;
                this.ghostAura.scale.set(scale, scale, scale);
            }
        }

        // Handle magnet effect
        if (this.magnetActive) {
            this.updateMagnetEffect();
        }
    }

    updateMagnetEffect() {
        if (!this.game.snake || !this.game.pellets) return;

        const snakePosition = this.game.snake.head.position;
        const magnetStrength = 0.5; // Adjust this value to control magnet strength

        this.game.pellets.forEach(pellet => {
            const distance = pellet.position.distanceTo(snakePosition);
            if (distance < this.magnetRadius) {
                    const direction = new THREE.Vector3()
                    .subVectors(snakePosition, pellet.position)
                        .normalize();
                
                // Apply force to pellet
                pellet.velocity.add(direction.multiplyScalar(magnetStrength));
            }
        });
    }

    isPowerUpActive(type) {
        return this.activePowerUps.has(type);
    }

    spawnPowerUp() {
        // Implementation of spawning a power-up
    }

    activateSpeedBoost() {
        // Implementation of activating speed boost
    }
} 
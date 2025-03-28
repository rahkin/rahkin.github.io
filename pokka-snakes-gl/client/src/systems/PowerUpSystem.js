import * as THREE from 'three';

export class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.activePowerUps = new Map();
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
        console.log('PowerUpSystem: Starting');
        // Reset any existing power-ups
        this.cleanup();
        // Initialize magnet effect
        this.magnetActive = false;
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
        if (this.game.snake) {
            // Make snake semi-transparent
            this.game.snake.group.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
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
        for (const [type, data] of this.activePowerUps.entries()) {
            const elapsed = performance.now() - data.startTime;
            if (elapsed >= data.duration) {
                this.deactivatePowerUp(type);
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

    cleanup() {
        // Deactivate all active power-ups
        for (const [type] of this.activePowerUps.entries()) {
            this.deactivatePowerUp(type);
        }
        this.activePowerUps.clear();
    }
} 
import * as THREE from 'three';

export class PowerUp {
    static Types = {
        SPEED: {
            color: 0xffff00,
            duration: 5000,
            name: 'Speed Boost',
            effect: (snake) => {
                snake.setSpeed(snake.speed * 1.5);
            },
            revert: (snake) => {
                snake.setSpeed(snake.config.speed);
            }
        },
        SLOW: {
            color: 0x00ffff,
            duration: 5000,
            name: 'Time Slow',
            effect: (snake) => {
                snake.setSpeed(snake.speed * 0.5);
            },
            revert: (snake) => {
                snake.setSpeed(snake.config.speed);
            }
        },
        GHOST: {
            color: 0xff00ff,
            duration: 3000,
            name: 'Ghost Mode',
            effect: (snake) => {
                snake.setGhostMode(true);
            },
            revert: (snake) => {
                snake.setGhostMode(false);
            }
        },
        DOUBLE_POINTS: {
            color: 0xff8800,
            duration: 8000,
            name: 'Double Points',
            effect: (snake) => {
                snake.setScoreMultiplier(2);
            },
            revert: (snake) => {
                snake.setScoreMultiplier(1);
            }
        }
    };

    constructor(scene, position, type) {
        this.scene = scene;
        this.type = type;
        
        // Create floating power-up
        const geometry = new THREE.OctahedronGeometry(0.6);
        const material = new THREE.MeshPhongMaterial({
            color: type.color,
            emissive: type.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Add glow effect
        const glowGeometry = new THREE.OctahedronGeometry(0.8);
        const glowMaterial = new THREE.MeshPhongMaterial({
            color: type.color,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glow);
        
        this.scene.add(this.mesh);
        
        // Animation properties
        this.startY = position.y;
        this.floatOffset = 0;
    }

    update() {
        // Floating animation
        this.floatOffset += 0.05;
        this.mesh.position.y = this.startY + Math.sin(this.floatOffset) * 0.2;
        
        // Rotation
        this.mesh.rotation.y += 0.02;
        this.mesh.rotation.z += 0.01;
    }

    collect(snake) {
        // Apply power-up effect
        this.type.effect(snake);
        
        // Create collection effect
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: this.type.color,
                size: 0.2,
                transparent: true
            })
        );
        
        // Schedule effect removal
        setTimeout(() => {
            this.type.revert(snake);
        }, this.type.duration);
        
        // Remove power-up
        this.scene.remove(this.mesh);
    }

    remove() {
        this.scene.remove(this.mesh);
    }

    getPosition() {
        return this.mesh.position;
    }
} 
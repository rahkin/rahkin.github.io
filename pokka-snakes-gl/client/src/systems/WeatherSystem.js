import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentWeather = 'sunny';
        this.weatherParticles = [];
        this.weatherGroup = new THREE.Group();
        this.scene.add(this.weatherGroup);
        
        // Weather parameters
        this.weatherStates = {
            sunny: {
                particleCount: 0,
                particleSpeed: 0,
                particleSize: 0,
                color: 0xffffff
            },
            rain: {
                particleCount: 1000,
                particleSpeed: 0.5,
                particleSize: 0.1,
                color: 0x4444ff
            },
            snow: {
                particleCount: 500,
                particleSpeed: 0.2,
                particleSize: 0.2,
                color: 0xffffff
            }
        };

        this.initializeWeather();
    }

    initializeWeather() {
        this.createWeatherParticles();
        this.setWeather('sunny');
    }

    createWeatherParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const sizes = [];

        // Create a large number of particles
        for (let i = 0; i < 1000; i++) {
            positions.push(
                Math.random() * 100 - 50,  // x
                Math.random() * 100,        // y
                Math.random() * 100 - 50   // z
            );
            velocities.push(
                Math.random() * 2 - 1,     // vx
                Math.random() * 2 - 1,     // vy
                Math.random() * 2 - 1      // vz
            );
            sizes.push(Math.random() * 0.5);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });

        this.weatherParticles = new THREE.Points(geometry, material);
        this.weatherGroup.add(this.weatherParticles);
    }

    setWeather(weatherType) {
        if (!this.weatherStates[weatherType]) return;
        
        this.currentWeather = weatherType;
        const state = this.weatherStates[weatherType];
        
        // Update particle system based on weather type
        this.weatherParticles.material.color.setHex(state.color);
        this.weatherParticles.material.size = state.particleSize;
        
        // Reset particle positions based on weather type
        const positions = this.weatherParticles.geometry.attributes.position.array;
        const velocities = this.weatherParticles.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            if (weatherType === 'rain') {
                positions[i + 1] = Math.random() * 50 + 50; // Start from above
                velocities[i + 1] = -state.particleSpeed; // Fall downward
            } else if (weatherType === 'snow') {
                positions[i + 1] = Math.random() * 50 + 50;
                velocities[i + 1] = -state.particleSpeed;
                // Add some horizontal drift
                velocities[i] = (Math.random() - 0.5) * 0.5;
                velocities[i + 2] = (Math.random() - 0.5) * 0.5;
            } else {
                positions[i + 1] = Math.random() * 100;
                velocities[i + 1] = 0;
            }
        }
        
        this.weatherParticles.geometry.attributes.position.needsUpdate = true;
        this.weatherParticles.geometry.attributes.velocity.needsUpdate = true;
    }

    update(deltaTime) {
        if (this.currentWeather === 'sunny') return;

        const positions = this.weatherParticles.geometry.attributes.position.array;
        const velocities = this.weatherParticles.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            // Update positions based on velocities
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;

            // Reset particles that fall below ground level
            if (positions[i + 1] < -10) {
                positions[i + 1] = 100;
                positions[i] = Math.random() * 100 - 50;
                positions[i + 2] = Math.random() * 100 - 50;
            }
        }

        this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    }
} 
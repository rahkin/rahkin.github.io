import * as THREE from 'three';

export class Effects {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particleSystem = null;
        this.initParticleSystem();
    }

    initParticleSystem() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 0.5;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createCollectEffect(position) {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(position);
        this.scene.add(effect);

        // Animate the effect
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > 500) {
                this.scene.remove(effect);
                return;
            }
            
            const scale = 1 + (elapsed / 250);
            effect.scale.set(scale, scale, scale);
            effect.material.opacity = 1 - (elapsed / 500);
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    updateTrail(positions) {
        const geometry = this.particleSystem.geometry;
        const positionAttribute = geometry.attributes.position;

        // Shift all particles one position back
        for (let i = positionAttribute.count - 1; i > 0; i--) {
            positionAttribute.setXYZ(
                i,
                positionAttribute.getX(i - 1),
                positionAttribute.getY(i - 1),
                positionAttribute.getZ(i - 1)
            );
        }

        // Add new position at the start
        if (positions.length > 0) {
            const pos = positions[0];
            positionAttribute.setXYZ(0, pos.x, pos.y, pos.z);
        }

        positionAttribute.needsUpdate = true;
    }
} 
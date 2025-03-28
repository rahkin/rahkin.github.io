import * as THREE from 'three';

export class Pellet {
    constructor(game, position, type = 'normal') {
        this.game = game;
        this.type = type;
        this.value = this.getPelletValue(type);
        this.mesh = this.createPelletMesh(type);
        this.position = position || this.getRandomPosition();
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
        
        // Add glow effect
        this.addGlowEffect();
    }

    createPelletMesh(type) {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.getPelletColor(type),
            emissive: this.getPelletColor(type),
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    addGlowEffect() {
        // Create a point light for the glow
        const light = new THREE.PointLight(
            this.getPelletColor(this.type),
            1,
            2
        );
        light.position.copy(this.mesh.position);
        this.game.scene.add(light);
        this.light = light;
    }

    getPelletColor(type) {
        const colors = {
            normal: 0xffff00,
            bonus: 0xff0000,
            special: 0x00ffff
        };
        return colors[type] || colors.normal;
    }

    getPelletValue(type) {
        const values = {
            normal: 100,
            bonus: 250,
            special: 500
        };
        return values[type] || values.normal;
    }

    getRandomPosition() {
        const range = 45; // Half the ground size minus margin
        return new THREE.Vector3(
            (Math.random() - 0.5) * range * 2,
            0.3, // Slightly above ground
            (Math.random() - 0.5) * range * 2
        );
    }

    update(deltaTime) {
        // Floating animation
        this.mesh.position.y = this.position.y + 
            Math.sin(Date.now() * 0.003) * 0.1;
        
        // Rotation
        this.mesh.rotation.y += deltaTime * 2;
        
        // Update light position
        if (this.light) {
            this.light.position.copy(this.mesh.position);
        }
    }

    collect() {
        this.game.scene.remove(this.mesh);
        if (this.light) {
            this.game.scene.remove(this.light);
        }
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
} 
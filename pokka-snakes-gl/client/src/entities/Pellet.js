import * as THREE from 'three';

export class Pellet {
    constructor(game, position, type = 'normal') {
        this.game = game;
        this.type = type;
        this.velocity = new THREE.Vector3();
        
        // Set position or generate random position
        this.position = position || new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            0.5,
            (Math.random() - 0.5) * 40
        );

        // Create visual appearance based on type
        this.createMesh();
        
        // Add to scene
        this.game.scene.add(this.mesh);
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: this.type === 'normal' ? 0xff0000 : 0xffff00,
            emissive: this.type === 'normal' ? 0xff0000 : 0xffff00,
            emissiveIntensity: 0.5
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    update(deltaTime) {
        // Update position if needed
        if (this.velocity.lengthSq() > 0) {
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            this.mesh.position.copy(this.position);
        }
    }

    cleanup() {
        if (this.mesh) {
            this.game.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.mesh.children) {
                this.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }
    }
} 
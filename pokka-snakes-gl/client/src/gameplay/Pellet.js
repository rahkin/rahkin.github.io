import * as THREE from 'three';

export class Pellet {
    constructor(scene, position) {
        this.scene = scene;
        
        // Create pellet geometry (sphere for visual distinction from snake)
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }

    remove() {
        this.scene.remove(this.mesh);
    }

    getPosition() {
        return this.mesh.position;
    }
} 
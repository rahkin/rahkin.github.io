import * as THREE from 'three';

export class Obstacle {
    constructor(scene, position, size = new THREE.Vector3(2, 2, 1)) {
        this.scene = scene;
        
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            emissive: 0x500000
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Add warning markers
        const markerGeometry = new THREE.PlaneGeometry(size.x + 0.4, size.y + 0.4);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.marker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.marker.position.z = -0.1;
        this.mesh.add(this.marker);
        
        this.scene.add(this.mesh);
    }

    checkCollision(position) {
        const bounds = new THREE.Box3().setFromObject(this.mesh);
        return bounds.containsPoint(position);
    }

    remove() {
        this.scene.remove(this.mesh);
    }
} 
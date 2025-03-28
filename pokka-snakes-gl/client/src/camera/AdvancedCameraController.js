import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class AdvancedCameraController {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.target = null;
        this.offset = new THREE.Vector3(0, 30, 40);
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        
        this.settings = {
            followSpeed: 5.0,
            rotationSpeed: 2.0,
            zoomSpeed: 1.0,
            minZoom: 20,
            maxZoom: 100,
            shakeMagnitude: 0.5,
            tiltRange: { min: 0.3, max: 1.2 }
        };

        this.shake = {
            active: false,
            duration: 0,
            intensity: 0,
            trauma: 0
        };

        // Bind methods
        this.update = this.update.bind(this);
        this.setTarget = this.setTarget.bind(this);
        this.cleanup = this.cleanup.bind(this);

        this.setupControls();
    }

    setupControls() {
        if (!this.game || !this.game.renderer) {
            console.error('Game or renderer not initialized');
            return;
        }

        try {
            this.orbitControls = new OrbitControls(
                this.camera, 
                this.game.renderer.domElement
            );
            
            // Configure orbit controls
            this.orbitControls.enableDamping = true;
            this.orbitControls.dampingFactor = 0.05;
            this.orbitControls.screenSpacePanning = false;
            this.orbitControls.minDistance = this.settings.minZoom;
            this.orbitControls.maxDistance = this.settings.maxZoom;
            this.orbitControls.maxPolarAngle = Math.PI / 2;
            
            this.orbitControls.enabled = false;
        } catch (error) {
            console.error('Error setting up OrbitControls:', error);
        }
    }

    update(deltaTime) {
        if (!this.camera || !this.target) return;

        try {
            // Calculate desired camera position
            const targetPosition = this.target.position.clone().add(this.offset);
            
            // Smoothly interpolate current position
            this.currentPosition.lerp(targetPosition, deltaTime * this.settings.followSpeed);
            this.currentLookAt.lerp(this.target.position, deltaTime * this.settings.followSpeed);

            // Update camera position and look at
            this.camera.position.copy(this.currentPosition);
            this.camera.lookAt(this.currentLookAt);

            // Update orbit controls if enabled
            if (this.orbitControls && this.orbitControls.enabled) {
                this.orbitControls.update();
            }

            // Update camera shake if active
            if (this.shake.active) {
                this.updateShake(deltaTime);
            }
        } catch (error) {
            console.error('Error in camera update:', error);
        }
    }

    updateShake(deltaTime) {
        if (this.shake.trauma <= 0) {
            this.shake.active = false;
            return;
        }

        const shake = new THREE.Vector3(
            (Math.random() - 0.5) * this.shake.intensity * this.settings.shakeMagnitude,
            (Math.random() - 0.5) * this.shake.intensity * this.settings.shakeMagnitude,
            (Math.random() - 0.5) * this.shake.intensity * this.settings.shakeMagnitude
        );

        this.camera.position.add(shake);
        this.shake.trauma = Math.max(0, this.shake.trauma - deltaTime * 2);
    }

    setTarget(target) {
        this.target = target;
        if (target) {
            this.currentPosition.copy(target.position).add(this.offset);
            this.currentLookAt.copy(target.position);
            this.camera.position.copy(this.currentPosition);
            this.camera.lookAt(this.currentLookAt);
        }
    }

    cleanup() {
        if (this.orbitControls) {
            this.orbitControls.dispose();
            this.orbitControls = null;
        }
    }
} 
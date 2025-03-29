import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class AdvancedCameraController {
    constructor(game) {
        if (!game || !game.camera) {
            throw new Error('Game and camera must be initialized');
        }

        this.game = game;
        this.camera = game.camera;
        this.target = null;
        this.offset = new THREE.Vector3(0, 15, 20);
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        this.smoothFactor = 0.1;
        this.defaultPosition = new THREE.Vector3(0, 15, 20);
        this.defaultLookAt = new THREE.Vector3(0, 0, 0);
        
        this.settings = {
            followSpeed: 2.0,  // Reduced for smoother following
            rotationSpeed: 1.0,
            zoomSpeed: 1.0,
            minZoom: 10,
            maxZoom: 50,
            shakeMagnitude: 0.5,
            tiltRange: { min: 0.3, max: 1.2 }
        };

        this.shake = {
            active: false,
            duration: 0,
            intensity: 0,
            trauma: 0
        };

        // Initialize position
        this.currentPosition.copy(this.camera.position);
        this.currentLookAt.set(0, 0, 0);

        // Bind methods
        this.update = this.update.bind(this);
        this.setTarget = this.setTarget.bind(this);
        this.cleanup = this.cleanup.bind(this);
        this.reset = this.reset.bind(this);

        // Setup controls after initialization
        if (game.renderer) {
            this.setupControls();
        } else {
            console.warn('Renderer not initialized, skipping OrbitControls setup');
        }
    }

    setupControls() {
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
            console.warn('Error setting up OrbitControls:', error);
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

            // Log camera position for debugging
            if (Math.random() < 0.01) { // Only log occasionally
                console.log('Camera: Updated position', {
                    cameraPosition: this.camera.position.clone(),
                    targetPosition: this.target.position.clone(),
                    offset: this.offset.clone(),
                    currentLookAt: this.currentLookAt.clone()
                });
            }

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
        if (!target) return;
        
        this.target = target;
        // Immediately update position to avoid initial camera jump
        this.currentPosition.copy(target.position).add(this.offset);
        this.currentLookAt.copy(target.position);
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
        
        console.log('Camera: Set new target', {
            targetPosition: target.position.clone(),
            cameraPosition: this.camera.position.clone(),
            offset: this.offset.clone()
        });
    }

    cleanup() {
        if (this.orbitControls) {
            this.orbitControls.dispose();
            this.orbitControls = null;
        }
    }

    reset() {
        // Reset camera to default position and orientation
        this.camera.position.copy(this.defaultPosition);
        this.currentLookAt.copy(this.defaultLookAt);
        this.camera.lookAt(this.defaultLookAt);
        
        console.log('Camera: Reset to default position', {
            position: this.camera.position.clone(),
            lookAt: this.currentLookAt.clone()
        });
    }
} 
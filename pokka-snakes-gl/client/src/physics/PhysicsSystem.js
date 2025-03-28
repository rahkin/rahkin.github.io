import * as THREE from 'three';

export class PhysicsSystem {
    constructor(scene) {
        this.scene = scene;
        this.bodies = new Map();
        this.constraints = new Map();
        this.collisionGroups = new Map();
        
        this.gravity = new THREE.Vector3(0, -9.81, 0);
        this.timeStep = 1/60;
        this.substeps = 3;
        
        this.setupCollisionGroups();
    }

    setupCollisionGroups() {
        this.addCollisionGroup('default');
        this.addCollisionGroup('player');
        this.addCollisionGroup('enemy');
        this.addCollisionGroup('powerUp');
        this.addCollisionGroup('obstacle');
    }

    addCollisionGroup(name, collidesWith = ['default']) {
        this.collisionGroups.set(name, new Set(collidesWith));
    }

    createBody(options = {}) {
        const body = {
            id: THREE.MathUtils.generateUUID(),
            position: options.position || new THREE.Vector3(),
            velocity: options.velocity || new THREE.Vector3(),
            acceleration: options.acceleration || new THREE.Vector3(),
            mass: options.mass || 1,
            restitution: options.restitution || 0.5,
            friction: options.friction || 0.5,
            type: options.type || 'dynamic',
            shape: options.shape || 'sphere',
            size: options.size || new THREE.Vector3(1, 1, 1),
            collisionGroup: options.collisionGroup || 'default',
            isTrigger: options.isTrigger || false,
            onCollision: options.onCollision || null,
            onTrigger: options.onTrigger || null,
            mesh: options.mesh || null
        };

        this.bodies.set(body.id, body);
        return body.id;
    }

    createConstraint(options = {}) {
        const constraint = {
            id: THREE.MathUtils.generateUUID(),
            bodyA: options.bodyA,
            bodyB: options.bodyB,
            type: options.type || 'distance',
            parameters: options.parameters || {},
            enabled: true
        };

        this.constraints.set(constraint.id, constraint);
        return constraint.id;
    }

    update(deltaTime) {
        const dt = this.timeStep;
        
        for (let step = 0; step < this.substeps; step++) {
            this.updateForces(dt);
            this.updateVelocities(dt);
            this.updatePositions(dt);
            this.resolveCollisions();
            this.applyConstraints();
        }
    }

    updateForces(dt) {
        this.bodies.forEach(body => {
            if (body.type === 'static') return;

            // Apply gravity
            body.acceleration.copy(this.gravity);

            // Apply custom forces
            if (body.applyForces) {
                body.applyForces(body, dt);
            }
        });
    }

    updateVelocities(dt) {
        this.bodies.forEach(body => {
            if (body.type === 'static') return;

            // Update velocity using acceleration
            body.velocity.addScaledVector(body.acceleration, dt);

            // Apply damping
            body.velocity.multiplyScalar(1 - body.friction * dt);
        });
    }

    updatePositions(dt) {
        this.bodies.forEach(body => {
            if (body.type === 'static') return;

            // Update position using velocity
            body.position.addScaledVector(body.velocity, dt);

            // Update mesh position if it exists
            if (body.mesh) {
                body.mesh.position.copy(body.position);
            }
        });
    }

    resolveCollisions() {
        const pairs = this.broadphase();
        
        pairs.forEach(pair => {
            if (this.canCollide(pair[0], pair[1])) {
                const collision = this.narrowphase(pair[0], pair[1]);
                
                if (collision) {
                    if (pair[0].isTrigger || pair[1].isTrigger) {
                        this.handleTrigger(pair[0], pair[1], collision);
                    } else {
                        this.resolveCollision(pair[0], pair[1], collision);
                    }
                }
            }
        });
    }

    broadphase() {
        const pairs = [];
        const bodies = Array.from(this.bodies.values());

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const bodyA = bodies[i];
                const bodyB = bodies[j];

                // Simple AABB check
                if (this.aabbIntersect(bodyA, bodyB)) {
                    pairs.push([bodyA, bodyB]);
                }
            }
        }

        return pairs;
    }

    narrowphase(bodyA, bodyB) {
        // Implement different collision checks based on shape types
        switch(bodyA.shape + '-' + bodyB.shape) {
            case 'sphere-sphere':
                return this.sphereSphereCollision(bodyA, bodyB);
            case 'box-box':
                return this.boxBoxCollision(bodyA, bodyB);
            case 'sphere-box':
                return this.sphereBoxCollision(bodyA, bodyB);
            case 'box-sphere':
                return this.sphereBoxCollision(bodyB, bodyA);
            default:
                return null;
        }
    }

    sphereSphereCollision(bodyA, bodyB) {
        const radiusSum = bodyA.size.x/2 + bodyB.size.x/2;
        const delta = bodyB.position.clone().sub(bodyA.position);
        const distance = delta.length();

        if (distance < radiusSum) {
            return {
                normal: delta.normalize(),
                depth: radiusSum - distance,
                point: bodyA.position.clone().add(delta.multiplyScalar(0.5))
            };
        }

        return null;
    }

    boxBoxCollision(bodyA, bodyB) {
        // Implement SAT (Separating Axis Theorem) collision detection
        // This is a simplified version
        const halfSizeA = bodyA.size.clone().multiplyScalar(0.5);
        const halfSizeB = bodyB.size.clone().multiplyScalar(0.5);
        const delta = bodyB.position.clone().sub(bodyA.position);

        // Check overlap on each axis
        const overlapX = halfSizeA.x + halfSizeB.x - Math.abs(delta.x);
        const overlapY = halfSizeA.y + halfSizeB.y - Math.abs(delta.y);
        const overlapZ = halfSizeA.z + halfSizeB.z - Math.abs(delta.z);

        if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
            // Find minimum overlap axis
            const minOverlap = Math.min(overlapX, overlapY, overlapZ);
            const normal = new THREE.Vector3();

            if (minOverlap === overlapX) {
                normal.x = Math.sign(delta.x);
            } else if (minOverlap === overlapY) {
                normal.y = Math.sign(delta.y);
            } else {
                normal.z = Math.sign(delta.z);
            }

            return {
                normal: normal,
                depth: minOverlap,
                point: bodyA.position.clone().add(bodyB.position).multiplyScalar(0.5)
            };
        }

        return null;
    }

    resolveCollision(bodyA, bodyB, collision) {
        if (bodyA.type === 'static' && bodyB.type === 'static') return;

        // Calculate relative velocity
        const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
        const velocityAlongNormal = relativeVelocity.dot(collision.normal);

        // Don't resolve if objects are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution
        const restitution = Math.min(bodyA.restitution, bodyB.restitution);

        // Calculate impulse scalar
        let j = -(1 + restitution) * velocityAlongNormal;
        j /= (1 / bodyA.mass) + (1 / bodyB.mass);

        // Apply impulse
        const impulse = collision.normal.clone().multiplyScalar(j);

        if (bodyA.type !== 'static') {
            bodyA.velocity.sub(impulse.multiplyScalar(1 / bodyA.mass));
        }

        if (bodyB.type !== 'static') {
            bodyB.velocity.add(impulse.multiplyScalar(1 / bodyB.mass));
        }

        // Positional correction
        const percent = 0.2; // penetration percentage to correct
        const slop = 0.01; // penetration allowance
        const correction = collision.normal.clone()
            .multiplyScalar(Math.max(collision.depth - slop, 0) * percent);

        if (bodyA.type !== 'static') {
            bodyA.position.sub(correction.multiplyScalar(1 / bodyA.mass));
        }

        if (bodyB.type !== 'static') {
            bodyB.position.add(correction.multiplyScalar(1 / bodyB.mass));
        }

        // Trigger collision callbacks
        if (bodyA.onCollision) bodyA.onCollision(bodyB, collision);
        if (bodyB.onCollision) bodyB.onCollision(bodyA, collision);
    }

    handleTrigger(bodyA, bodyB, collision) {
        if (bodyA.isTrigger && bodyA.onTrigger) {
            bodyA.onTrigger(bodyB, collision);
        }
        if (bodyB.isTrigger && bodyB.onTrigger) {
            bodyB.onTrigger(bodyA, collision);
        }
    }

    applyConstraints() {
        this.constraints.forEach(constraint => {
            if (!constraint.enabled) return;

            const bodyA = this.bodies.get(constraint.bodyA);
            const bodyB = this.bodies.get(constraint.bodyB);

            switch(constraint.type) {
                case 'distance':
                    this.applyDistanceConstraint(bodyA, bodyB, constraint.parameters);
                    break;
                case 'spring':
                    this.applySpringConstraint(bodyA, bodyB, constraint.parameters);
                    break;
                // Add more constraint types as needed
            }
        });
    }

    applyDistanceConstraint(bodyA, bodyB, parameters) {
        const delta = bodyB.position.clone().sub(bodyA.position);
        const currentDistance = delta.length();
        const targetDistance = parameters.distance;

        if (currentDistance === 0) return;

        const correction = delta.multiplyScalar(
            (currentDistance - targetDistance) / currentDistance
        );

        if (bodyA.type !== 'static') {
            bodyA.position.add(correction.multiplyScalar(0.5));
        }

        if (bodyB.type !== 'static') {
            bodyB.position.sub(correction.multiplyScalar(0.5));
        }
    }

    applySpringConstraint(bodyA, bodyB, parameters) {
        const delta = bodyB.position.clone().sub(bodyA.position);
        const force = delta.multiplyScalar(parameters.stiffness);

        if (bodyA.type !== 'static') {
            bodyA.velocity.add(force.multiplyScalar(1 / bodyA.mass));
        }

        if (bodyB.type !== 'static') {
            bodyB.velocity.sub(force.multiplyScalar(1 / bodyB.mass));
        }
    }

    canCollide(bodyA, bodyB) {
        const groupA = this.collisionGroups.get(bodyA.collisionGroup);
        const groupB = this.collisionGroups.get(bodyB.collisionGroup);

        return groupA.has(bodyB.collisionGroup) || groupB.has(bodyA.collisionGroup);
    }

    aabbIntersect(bodyA, bodyB) {
        const aMin = bodyA.position.clone().sub(bodyA.size.clone().multiplyScalar(0.5));
        const aMax = bodyA.position.clone().add(bodyA.size.clone().multiplyScalar(0.5));
        const bMin = bodyB.position.clone().sub(bodyB.size.clone().multiplyScalar(0.5));
        const bMax = bodyB.position.clone().add(bodyB.size.clone().multiplyScalar(0.5));

        return (aMin.x <= bMax.x && aMax.x >= bMin.x) &&
               (aMin.y <= bMax.y && aMax.y >= bMin.y) &&
               (aMin.z <= bMax.z && aMax.z >= bMin.z);
    }

    removeBody(id) {
        this.bodies.delete(id);
    }

    removeConstraint(id) {
        this.constraints.delete(id);
    }

    clear() {
        this.bodies.clear();
        this.constraints.clear();
    }
} 
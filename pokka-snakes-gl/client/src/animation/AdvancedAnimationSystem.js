export class AdvancedAnimationSystem {
    constructor() {
        this.animations = new Map();
        this.activeAnimations = new Map();
        this.sequences = new Map();
        this.mixer = new THREE.AnimationMixer();
        this.clock = new THREE.Clock();
        this.interpolators = new Map();
        
        this.setupInterpolators();
    }

    setupInterpolators() {
        // Basic interpolation functions
        this.interpolators.set('linear', (start, end, t) => {
            return start + (end - start) * t;
        });

        this.interpolators.set('quadratic', (start, end, t) => {
            return start + (end - start) * t * t;
        });

        this.interpolators.set('cubic', (start, end, t) => {
            return start + (end - start) * t * t * t;
        });

        this.interpolators.set('elastic', (start, end, t) => {
            const p = 0.3;
            return start + (end - start) * (Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1);
        });

        this.interpolators.set('bounce', (start, end, t) => {
            if (t < (1 / 2.75)) {
                return start + (end - start) * (7.5625 * t * t);
            } else if (t < (2 / 2.75)) {
                t -= (1.5 / 2.75);
                return start + (end - start) * (7.5625 * t * t + 0.75);
            } else if (t < (2.5 / 2.75)) {
                t -= (2.25 / 2.75);
                return start + (end - start) * (7.5625 * t * t + 0.9375);
            } else {
                t -= (2.625 / 2.75);
                return start + (end - start) * (7.5625 * t * t + 0.984375);
            }
        });
    }

    createAnimation(name, config) {
        const animation = {
            id: THREE.MathUtils.generateUUID(),
            name,
            duration: config.duration || 1000,
            delay: config.delay || 0,
            loop: config.loop || false,
            interpolation: config.interpolation || 'linear',
            tracks: new Map(),
            events: config.events || [],
            onStart: config.onStart,
            onUpdate: config.onUpdate,
            onComplete: config.onComplete
        };

        this.animations.set(animation.id, animation);
        return animation.id;
    }

    addTrack(animationId, trackConfig) {
        const animation = this.animations.get(animationId);
        if (!animation) return null;

        const track = {
            id: THREE.MathUtils.generateUUID(),
            target: trackConfig.target,
            property: trackConfig.property,
            startValue: trackConfig.startValue,
            endValue: trackConfig.endValue,
            interpolation: trackConfig.interpolation || animation.interpolation
        };

        animation.tracks.set(track.id, track);
        return track.id;
    }

    createSequence(name, config) {
        const sequence = {
            id: THREE.MathUtils.generateUUID(),
            name,
            steps: config.steps || [],
            currentStep: 0,
            loop: config.loop || false,
            onComplete: config.onComplete
        };

        this.sequences.set(sequence.id, sequence);
        return sequence.id;
    }

    addStep(sequenceId, stepConfig) {
        const sequence = this.sequences.get(sequenceId);
        if (!sequence) return;

        sequence.steps.push({
            animation: stepConfig.animation,
            delay: stepConfig.delay || 0,
            conditions: stepConfig.conditions || []
        });
    }

    play(animationId, options = {}) {
        const animation = this.animations.get(animationId);
        if (!animation) return null;

        const instance = {
            id: THREE.MathUtils.generateUUID(),
            animation,
            startTime: performance.now() + animation.delay,
            progress: 0,
            completed: false,
            paused: false,
            speed: options.speed || 1,
            direction: options.direction || 1,
            ...options
        };

        this.activeAnimations.set(instance.id, instance);
        
        if (animation.onStart) {
            animation.onStart(instance);
        }

        return instance.id;
    }

    playSequence(sequenceId) {
        const sequence = this.sequences.get(sequenceId);
        if (!sequence) return null;

        sequence.currentStep = 0;
        this.playNextStep(sequence);
    }

    playNextStep(sequence) {
        if (sequence.currentStep >= sequence.steps.length) {
            if (sequence.loop) {
                sequence.currentStep = 0;
            } else {
                if (sequence.onComplete) {
                    sequence.onComplete();
                }
                return;
            }
        }

        const step = sequence.steps[sequence.currentStep];
        setTimeout(() => {
            const instanceId = this.play(step.animation, {
                onComplete: () => {
                    sequence.currentStep++;
                    this.playNextStep(sequence);
                }
            });
        }, step.delay);
    }

    update() {
        const currentTime = performance.now();

        this.activeAnimations.forEach((instance, instanceId) => {
            if (instance.paused || instance.completed) return;

            const elapsed = currentTime - instance.startTime;
            const duration = instance.animation.duration;
            
            instance.progress = Math.min(Math.max(elapsed / duration, 0), 1);

            if (instance.direction === -1) {
                instance.progress = 1 - instance.progress;
            }

            this.updateTracks(instance);
            this.checkEvents(instance);

            if (instance.animation.onUpdate) {
                instance.animation.onUpdate(instance);
            }

            if (elapsed >= duration) {
                if (instance.animation.loop) {
                    instance.startTime = currentTime;
                } else {
                    instance.completed = true;
                    if (instance.animation.onComplete) {
                        instance.animation.onComplete(instance);
                    }
                    this.activeAnimations.delete(instanceId);
                }
            }
        });

        // Update THREE.js animation mixer
        const delta = this.clock.getDelta();
        this.mixer.update(delta);
    }

    updateTracks(instance) {
        instance.animation.tracks.forEach(track => {
            const interpolator = this.interpolators.get(track.interpolation);
            if (!interpolator) return;

            let value;
            if (Array.isArray(track.startValue)) {
                value = track.startValue.map((start, index) => {
                    const end = track.endValue[index];
                    return interpolator(start, end, instance.progress);
                });
            } else {
                value = interpolator(track.startValue, track.endValue, instance.progress);
            }

            if (typeof track.target[track.property] === 'function') {
                track.target[track.property](value);
            } else {
                track.target[track.property] = value;
            }
        });
    }

    checkEvents(instance) {
        instance.animation.events.forEach(event => {
            if (!event.triggered && instance.progress >= event.time) {
                event.callback(instance);
                event.triggered = true;
            }
        });
    }

    pause(instanceId) {
        const instance = this.activeAnimations.get(instanceId);
        if (instance) {
            instance.paused = true;
        }
    }

    resume(instanceId) {
        const instance = this.activeAnimations.get(instanceId);
        if (instance) {
            instance.paused = false;
            instance.startTime = performance.now() - (instance.progress * instance.animation.duration);
        }
    }

    stop(instanceId) {
        this.activeAnimations.delete(instanceId);
    }

    setSpeed(instanceId, speed) {
        const instance = this.activeAnimations.get(instanceId);
        if (instance) {
            const oldSpeed = instance.speed;
            instance.speed = speed;
            instance.startTime = performance.now() - 
                ((performance.now() - instance.startTime) * oldSpeed / speed);
        }
    }

    reverse(instanceId) {
        const instance = this.activeAnimations.get(instanceId);
        if (instance) {
            instance.direction *= -1;
            instance.startTime = performance.now() - 
                ((instance.animation.duration * (1 - instance.progress)));
        }
    }

    getProgress(instanceId) {
        const instance = this.activeAnimations.get(instanceId);
        return instance ? instance.progress : 0;
    }

    clear() {
        this.activeAnimations.clear();
        this.mixer.stopAllAction();
    }
} 
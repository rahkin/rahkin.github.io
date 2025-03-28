export class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = null;
        this.modes = new Map();
        
        this.setupGameModes();
    }

    setupGameModes() {
        // Classic Mode
        this.registerMode('classic', {
            name: 'Classic',
            description: 'Traditional snake gameplay',
            setup: () => {
                this.setupClassicMode();
            },
            rules: {
                growth: true,
                wallCollision: true,
                powerUps: false,
                timeLimit: false
            }
        });

        // Battle Royale Mode
        this.registerMode('battle-royale', {
            name: 'Battle Royale',
            description: 'Last snake standing wins',
            setup: () => {
                this.setupBattleRoyaleMode();
            },
            rules: {
                growth: true,
                wallCollision: false,
                powerUps: true,
                shrinkingArena: true,
                respawn: false
            }
        });

        // Speed Run Mode
        this.registerMode('speed-run', {
            name: 'Speed Run',
            description: 'Collect targets against the clock',
            setup: () => {
                this.setupSpeedRunMode();
            },
            rules: {
                growth: false,
                wallCollision: true,
                powerUps: true,
                timeLimit: true,
                targets: true
            }
        });

        // Zen Mode
        this.registerMode('zen', {
            name: 'Zen Mode',
            description: 'Relaxed gameplay without death',
            setup: () => {
                this.setupZenMode();
            },
            rules: {
                growth: true,
                wallCollision: false,
                powerUps: true,
                immortal: true
            }
        });

        // Challenge Mode
        this.registerMode('challenge', {
            name: 'Challenge Mode',
            description: 'Complete objectives to progress',
            setup: () => {
                this.setupChallengeMode();
            },
            rules: {
                growth: true,
                wallCollision: true,
                powerUps: true,
                objectives: true,
                progression: true
            }
        });
    }

    registerMode(id, config) {
        this.modes.set(id, config);
    }

    setMode(modeId) {
        const mode = this.modes.get(modeId);
        if (!mode) return false;

        this.currentMode = modeId;
        mode.setup();
        this.game.events.emit('mode:changed', modeId);
        return true;
    }

    setupClassicMode() {
        this.game.reset();
        this.game.snake.setClassicBehavior();
        this.game.level.generateClassicLevel();
    }

    setupBattleRoyaleMode() {
        this.game.reset();
        this.setupArena();
        this.startShrinkingBoundary();
        this.spawnMultiplePlayers();
    }

    setupSpeedRunMode() {
        this.game.reset();
        this.game.snake.setSpeedRunBehavior();
        this.setupTargets();
        this.startTimer();
    }

    setupZenMode() {
        this.game.reset();
        this.game.snake.setInvincible(true);
        this.game.level.generateZenLevel();
        this.setupAmbientEffects();
    }

    setupChallengeMode() {
        this.game.reset();
        this.loadChallenges();
        this.setupFirstChallenge();
    }

    setupArena() {
        const arena = {
            radius: 100,
            boundary: new THREE.Mesh(
                new THREE.CircleGeometry(100, 32),
                new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.2
                })
            )
        };

        this.game.scene.add(arena.boundary);
        return arena;
    }

    startShrinkingBoundary() {
        const shrinkRate = 0.1; // units per second
        const minRadius = 20;

        this.shrinkInterval = setInterval(() => {
            const arena = this.game.arena;
            if (arena.radius > minRadius) {
                arena.radius -= shrinkRate;
                arena.boundary.scale.set(
                    arena.radius / 100,
                    arena.radius / 100,
                    1
                );
                this.checkBoundaryCollisions();
            }
        }, 1000 / 60);
    }

    setupTargets() {
        this.targets = [];
        for (let i = 0; i < 10; i++) {
            this.spawnTarget();
        }
    }

    spawnTarget() {
        const target = {
            position: this.getRandomPosition(),
            mesh: new THREE.Mesh(
                new THREE.SphereGeometry(1, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            ),
            value: Math.floor(Math.random() * 100) + 100
        };

        this.game.scene.add(target.mesh);
        this.targets.push(target);
    }

    startTimer() {
        this.timeRemaining = 60; // 60 seconds
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.game.ui.updateTimer(this.timeRemaining);

            if (this.timeRemaining <= 0) {
                this.endSpeedRun();
            }
        }, 1000);
    }

    setupAmbientEffects() {
        // Add peaceful background effects
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0x88ccff,
                size: 0.5,
                transparent: true,
                opacity: 0.5
            })
        );

        const positions = new Float32Array(1000 * 3);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = Math.random() * 200 - 100;
            positions[i + 1] = Math.random() * 200 - 100;
            positions[i + 2] = Math.random() * 200 - 100;
        }

        particles.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        );

        this.game.scene.add(particles);
    }

    loadChallenges() {
        this.challenges = [
            {
                id: 'speed-master',
                name: 'Speed Master',
                description: 'Reach maximum speed for 5 seconds',
                check: (stats) => stats.maxSpeed >= 2 && 
                    stats.timeAtMaxSpeed >= 5
            },
            {
                id: 'collector',
                name: 'Master Collector',
                description: 'Collect 50 pellets without dying',
                check: (stats) => stats.pelletsCollected >= 50
            },
            {
                id: 'survivor',
                name: 'Survivor',
                description: 'Survive for 3 minutes',
                check: (stats) => stats.timeAlive >= 180
            }
            // Add more challenges
        ];
    }

    setupFirstChallenge() {
        this.currentChallenge = this.challenges[0];
        this.game.ui.showChallenge(this.currentChallenge);
    }

    update(deltaTime) {
        if (!this.currentMode) return;

        switch (this.currentMode) {
            case 'battle-royale':
                this.updateBattleRoyale(deltaTime);
                break;
            case 'speed-run':
                this.updateSpeedRun(deltaTime);
                break;
            case 'challenge':
                this.updateChallenge(deltaTime);
                break;
        }
    }

    cleanup() {
        if (this.shrinkInterval) {
            clearInterval(this.shrinkInterval);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.targets?.forEach(target => {
            this.game.scene.remove(target.mesh);
        });
    }
} 
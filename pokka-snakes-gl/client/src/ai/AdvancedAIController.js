export class AdvancedAIController {
    constructor(game) {
        this.game = game;
        this.aiSnakes = new Map();
        this.behaviorTrees = new Map();
        this.decisionHistory = new Map();
        
        this.setupPersonalities();
        this.setupBehaviorPatterns();
    }

    setupPersonalities() {
        this.personalities = {
            aggressive: {
                riskTolerance: 0.8,
                aggressiveness: 0.9,
                resourcePriority: 0.3,
                adaptability: 0.6
            },
            cautious: {
                riskTolerance: 0.3,
                aggressiveness: 0.2,
                resourcePriority: 0.7,
                adaptability: 0.8
            },
            balanced: {
                riskTolerance: 0.5,
                aggressiveness: 0.5,
                resourcePriority: 0.5,
                adaptability: 0.5
            },
            opportunistic: {
                riskTolerance: 0.6,
                aggressiveness: 0.4,
                resourcePriority: 0.8,
                adaptability: 0.7
            }
        };
    }

    setupBehaviorPatterns() {
        this.patterns = {
            hunting: {
                conditions: [
                    (snake) => snake.health > 50,
                    (snake) => this.getNearbyTargets(snake).length > 0
                ],
                actions: [
                    (snake) => this.pursueNearestTarget(snake),
                    (snake) => this.performAttack(snake)
                ]
            },
            gathering: {
                conditions: [
                    (snake) => snake.health < 70,
                    (snake) => this.getNearbyResources(snake).length > 0
                ],
                actions: [
                    (snake) => this.gatherResources(snake),
                    (snake) => this.avoidThreats(snake)
                ]
            },
            surviving: {
                conditions: [
                    (snake) => snake.health < 30,
                    (snake) => this.getThreatsNearby(snake).length > 0
                ],
                actions: [
                    (snake) => this.findSafeZone(snake),
                    (snake) => this.heal(snake)
                ]
            }
        };
    }

    createAISnake(personality = 'balanced') {
        const id = `ai-${Date.now()}`;
        const config = {
            personality: this.personalities[personality],
            id: id
        };

        const snake = new AISnake(this.game, config);
        this.aiSnakes.set(id, snake);
        this.createBehaviorTree(snake);
        this.decisionHistory.set(id, []);

        return snake;
    }

    createBehaviorTree(snake) {
        const tree = new BehaviorTree({
            root: new Selector([
                // Survival branch
                new Sequence([
                    new Condition(() => this.checkDanger(snake)),
                    new Selector([
                        new Action(() => this.evade(snake)),
                        new Action(() => this.findSafeZone(snake))
                    ])
                ]),
                // Resource gathering branch
                new Sequence([
                    new Condition(() => this.shouldGatherResources(snake)),
                    new Action(() => this.gatherResources(snake))
                ]),
                // Combat branch
                new Sequence([
                    new Condition(() => this.canEngage(snake)),
                    new Selector([
                        new Action(() => this.attack(snake)),
                        new Action(() => this.pursue(snake))
                    ])
                ]),
                // Default behavior
                new Action(() => this.patrol(snake))
            ])
        });

        this.behaviorTrees.set(snake.id, tree);
    }

    update(deltaTime) {
        this.aiSnakes.forEach(snake => {
            if (snake.active) {
                this.updateSnake(snake, deltaTime);
            }
        });
    }

    updateSnake(snake, deltaTime) {
        // Update perception
        const perception = this.updatePerception(snake);
        
        // Update behavior tree
        const tree = this.behaviorTrees.get(snake.id);
        const decision = tree.update(perception);
        
        // Record decision
        this.recordDecision(snake, decision);
        
        // Apply personality influences
        this.applyPersonalityEffects(snake, decision);
        
        // Update movement and actions
        this.updateMovement(snake, deltaTime);
        this.updateActions(snake, deltaTime);
        
        // Learn from experience
        this.learn(snake);
    }

    updatePerception(snake) {
        return {
            nearbyPlayers: this.getNearbyPlayers(snake),
            nearbyResources: this.getNearbyResources(snake),
            threats: this.getThreatsNearby(snake),
            safeZones: this.findSafeZones(snake),
            currentState: snake.getState()
        };
    }

    getNearbyPlayers(snake) {
        return this.game.players.filter(player => 
            player.id !== snake.id &&
            player.position.distanceTo(snake.position) < snake.perceptionRange
        );
    }

    getNearbyResources(snake) {
        return this.game.resources.filter(resource =>
            resource.position.distanceTo(snake.position) < snake.perceptionRange
        );
    }

    getThreatsNearby(snake) {
        const threats = [];
        
        // Check for dangerous players
        this.getNearbyPlayers(snake).forEach(player => {
            if (this.evaluateThreatLevel(player, snake) > 0.7) {
                threats.push({
                    type: 'player',
                    entity: player,
                    level: this.evaluateThreatLevel(player, snake)
                });
            }
        });

        // Check for environmental threats
        this.game.obstacles.forEach(obstacle => {
            if (obstacle.position.distanceTo(snake.position) < snake.perceptionRange) {
                threats.push({
                    type: 'obstacle',
                    entity: obstacle,
                    level: 0.5
                });
            }
        });

        return threats;
    }

    evaluateThreatLevel(entity, snake) {
        let threat = 0;

        // Size comparison
        threat += entity.size / snake.size * 0.4;

        // Health comparison
        threat += (entity.health / entity.maxHealth) / 
            (snake.health / snake.maxHealth) * 0.3;

        // Recent combat success
        const combatHistory = this.decisionHistory.get(snake.id)
            .filter(d => d.type === 'combat' && d.target === entity.id);
        if (combatHistory.length > 0) {
            const success = combatHistory.filter(d => d.success).length / 
                combatHistory.length;
            threat += (1 - success) * 0.3;
        }

        return Math.min(threat, 1);
    }

    findSafeZones(snake) {
        const zones = [];
        const gridSize = 5;
        const range = snake.perceptionRange;

        for (let x = -range; x <= range; x += gridSize) {
            for (let z = -range; z <= range; z += gridSize) {
                const position = new THREE.Vector3(
                    snake.position.x + x,
                    0,
                    snake.position.z + z
                );

                const threats = this.getThreatsNearby(snake)
                    .filter(threat => 
                        threat.entity.position.distanceTo(position) < gridSize
                    );

                if (threats.length === 0) {
                    zones.push({
                        position: position,
                        safety: this.evaluateSafety(position, snake)
                    });
                }
            }
        }

        return zones.sort((a, b) => b.safety - a.safety);
    }

    evaluateSafety(position, snake) {
        let safety = 1;

        // Distance from threats
        this.getThreatsNearby(snake).forEach(threat => {
            const distance = threat.entity.position.distanceTo(position);
            safety *= Math.min(1, distance / snake.perceptionRange);
        });

        // Proximity to resources
        const nearbyResources = this.getNearbyResources(snake)
            .filter(resource => 
                resource.position.distanceTo(position) < snake.perceptionRange / 2
            );
        safety += nearbyResources.length * 0.1;

        // Distance from arena boundary
        const distanceFromCenter = position.length();
        safety *= Math.max(0, 1 - distanceFromCenter / this.game.arenaRadius);

        return Math.min(safety, 1);
    }

    recordDecision(snake, decision) {
        const history = this.decisionHistory.get(snake.id);
        history.push({
            type: decision.type,
            target: decision.target,
            success: decision.success,
            timestamp: Date.now()
        });

        // Keep only recent history
        while (history.length > 100) {
            history.shift();
        }
    }

    learn(snake) {
        const history = this.decisionHistory.get(snake.id);
        const recentDecisions = history.slice(-10);

        // Analyze success rates
        const successRates = {};
        recentDecisions.forEach(decision => {
            if (!successRates[decision.type]) {
                successRates[decision.type] = {
                    success: 0,
                    total: 0
                };
            }
            successRates[decision.type].total++;
            if (decision.success) {
                successRates[decision.type].success++;
            }
        });

        // Adjust behavior weights based on success rates
        Object.entries(successRates).forEach(([type, rate]) => {
            const success = rate.success / rate.total;
            this.adjustBehaviorWeight(snake, type, success);
        });
    }

    adjustBehaviorWeight(snake, behaviorType, successRate) {
        const personality = this.personalities[snake.personality];
        const adaptability = personality.adaptability;

        // Adjust weights based on success rate and adaptability
        const adjustment = (successRate - 0.5) * adaptability;
        
        switch (behaviorType) {
            case 'combat':
                personality.aggressiveness = Math.max(0, Math.min(1,
                    personality.aggressiveness + adjustment
                ));
                break;
            case 'gathering':
                personality.resourcePriority = Math.max(0, Math.min(1,
                    personality.resourcePriority + adjustment
                ));
                break;
            case 'survival':
                personality.riskTolerance = Math.max(0, Math.min(1,
                    personality.riskTolerance + adjustment
                ));
                break;
        }
    }

    cleanup() {
        this.aiSnakes.forEach(snake => snake.cleanup());
        this.aiSnakes.clear();
        this.behaviorTrees.clear();
        this.decisionHistory.clear();
    }
} 
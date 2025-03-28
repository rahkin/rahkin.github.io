export class AISnakeController {
    constructor(game) {
        this.game = game;
        this.aiSnakes = new Map();
        this.difficultyLevels = {
            easy: { reactionTime: 0.5, accuracy: 0.7, aggression: 0.3 },
            medium: { reactionTime: 0.3, accuracy: 0.8, aggression: 0.6 },
            hard: { reactionTime: 0.1, accuracy: 0.9, aggression: 0.8 }
        };
        
        this.personalities = {
            hunter: new HunterPersonality(),
            survivor: new SurvivorPersonality(),
            collector: new CollectorPersonality(),
            aggressive: new AggressivePersonality()
        };

        this.setupBehaviorTree();
    }

    setupBehaviorTree() {
        this.behaviorTree = {
            root: new Selector([
                // Survival branch
                new Sequence([
                    new Condition(() => this.checkDanger()),
                    new Selector([
                        new Action(() => this.evade()),
                        new Action(() => this.findSafeZone())
                    ])
                ]),
                // Hunting branch
                new Sequence([
                    new Condition(() => this.canHunt()),
                    new Selector([
                        new Action(() => this.pursueTarget()),
                        new Action(() => this.ambushTarget())
                    ])
                ]),
                // Collection branch
                new Sequence([
                    new Condition(() => this.shouldCollect()),
                    new Action(() => this.collectResources())
                ]),
                // Default behavior
                new Action(() => this.patrol())
            ])
        };
    }

    createAISnake(difficulty = 'medium', personality = 'hunter') {
        const id = `ai-snake-${Date.now()}`;
        const config = {
            ...this.difficultyLevels[difficulty],
            personality: this.personalities[personality],
            id: id
        };

        const aiSnake = new AISnake(this.game, config);
        this.aiSnakes.set(id, aiSnake);
        return aiSnake;
    }

    update(deltaTime) {
        this.aiSnakes.forEach(snake => {
            if (snake.active) {
                this.updateSnakeBehavior(snake, deltaTime);
            }
        });
    }

    updateSnakeBehavior(snake, deltaTime) {
        // Update perception
        snake.updatePerception(this.game.getGameState());
        
        // Execute behavior tree
        this.behaviorTree.root.execute(snake);
        
        // Apply personality influences
        snake.config.personality.influence(snake);
        
        // Update movement and actions
        this.updateMovement(snake, deltaTime);
        this.updateActions(snake, deltaTime);
    }

    updateMovement(snake, deltaTime) {
        const target = snake.currentTarget;
        if (!target) return;

        // Calculate optimal path
        const path = this.calculatePath(snake.position, target);
        
        // Apply steering behaviors
        const steering = this.calculateSteering(snake, path);
        
        // Update position and rotation
        snake.position.add(steering.linear.multiplyScalar(deltaTime));
        snake.rotation.add(steering.angular.multiplyScalar(deltaTime));
        
        // Apply constraints
        this.applyMovementConstraints(snake);
    }

    calculatePath(start, end) {
        // A* pathfinding implementation
        const path = [];
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const grid = this.game.getNavigationGrid();

        openSet.enqueue(start, 0);
        const cameFrom = new Map();
        const gScore = new Map();
        gScore.set(start, 0);

        while (!openSet.isEmpty()) {
            const current = openSet.dequeue();
            
            if (current.equals(end)) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(current);

            for (const neighbor of this.getNeighbors(current, grid)) {
                if (closedSet.has(neighbor)) continue;

                const tentativeGScore = gScore.get(current) + 
                    current.distanceTo(neighbor);

                if (!gScore.has(neighbor) || 
                    tentativeGScore < gScore.get(neighbor)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    const fScore = tentativeGScore + 
                        this.heuristic(neighbor, end);
                    
                    if (!openSet.contains(neighbor)) {
                        openSet.enqueue(neighbor, fScore);
                    }
                }
            }
        }

        return path;
    }

    calculateSteering(snake, path) {
        const steering = {
            linear: new THREE.Vector3(),
            angular: new THREE.Vector3()
        };

        // Seek behavior
        if (path.length > 0) {
            const targetPos = path[0];
            const desired = targetPos.clone()
                .sub(snake.position)
                .normalize()
                .multiplyScalar(snake.maxSpeed);
            
            steering.linear.add(desired.sub(snake.velocity));
        }

        // Obstacle avoidance
        const obstacles = this.game.getNearbyObstacles(snake.position);
        obstacles.forEach(obstacle => {
            const avoidance = this.calculateAvoidance(snake, obstacle);
            steering.linear.add(avoidance);
        });

        // Wall avoidance
        const wallAvoidance = this.calculateWallAvoidance(snake);
        steering.linear.add(wallAvoidance);

        // Limit steering forces
        steering.linear.clampLength(0, snake.maxForce);
        steering.angular.clampLength(0, snake.maxTorque);

        return steering;
    }

    updateActions(snake, deltaTime) {
        // Update cooldowns
        snake.cooldowns.forEach((value, key) => {
            if (value > 0) {
                snake.cooldowns.set(key, value - deltaTime);
            }
        });

        // Check and use power-ups
        if (snake.hasPowerUp && this.shouldUsePowerUp(snake)) {
            snake.activatePowerUp();
        }

        // Update combat actions
        if (this.canPerformAction(snake, 'attack')) {
            const target = this.findAttackTarget(snake);
            if (target) {
                snake.attack(target);
            }
        }
    }

    shouldUsePowerUp(snake) {
        const state = snake.getState();
        const personality = snake.config.personality;

        // Different personalities have different power-up usage strategies
        switch (personality.type) {
            case 'aggressive':
                return state.nearbyEnemies.length > 0;
            case 'survivor':
                return state.health < 0.5;
            case 'collector':
                return state.nearbyPellets.length > 2;
            default:
                return Math.random() < 0.5;
        }
    }

    findAttackTarget(snake) {
        const nearbySnakes = this.game.getNearbySnakes(
            snake.position,
            snake.attackRange
        );

        return nearbySnakes
            .filter(other => other.id !== snake.id)
            .sort((a, b) => {
                const distA = a.position.distanceTo(snake.position);
                const distB = b.position.distanceTo(snake.position);
                return distA - distB;
            })[0];
    }

    canPerformAction(snake, action) {
        return !snake.cooldowns.get(action);
    }

    applyMovementConstraints(snake) {
        // Apply speed limits
        snake.velocity.clampLength(0, snake.maxSpeed);
        
        // Keep within game bounds
        const bounds = this.game.getBounds();
        snake.position.x = THREE.MathUtils.clamp(
            snake.position.x,
            bounds.min.x,
            bounds.max.x
        );
        snake.position.z = THREE.MathUtils.clamp(
            snake.position.z,
            bounds.min.z,
            bounds.max.z
        );
    }

    removeAISnake(id) {
        const snake = this.aiSnakes.get(id);
        if (snake) {
            snake.cleanup();
            this.aiSnakes.delete(id);
        }
    }

    cleanup() {
        this.aiSnakes.forEach(snake => snake.cleanup());
        this.aiSnakes.clear();
    }
}

// Personality classes
class BasePersonality {
    influence(snake) {
        // Base implementation
    }
}

class HunterPersonality extends BasePersonality {
    influence(snake) {
        snake.aggression *= 1.2;
        snake.accuracy *= 1.1;
        snake.preferredTargets = ['players', 'powerUps'];
    }
}

class SurvivorPersonality extends BasePersonality {
    influence(snake) {
        snake.caution *= 1.5;
        snake.aggression *= 0.7;
        snake.preferredTargets = ['pellets', 'safeZones'];
    }
}

class CollectorPersonality extends BasePersonality {
    influence(snake) {
        snake.efficiency *= 1.3;
        snake.aggression *= 0.8;
        snake.preferredTargets = ['pellets', 'powerUps'];
    }
}

class AggressivePersonality extends BasePersonality {
    influence(snake) {
        snake.aggression *= 1.5;
        snake.caution *= 0.6;
        snake.preferredTargets = ['players', 'powerUps'];
    }
} 
import * as THREE from 'three';

export class AIController {
    constructor(scene, grid) {
        this.scene = scene;
        this.grid = grid;
        this.aiSnakes = new Map();
        this.behaviors = new Map();
        this.difficultyLevels = {
            easy: { reactionTime: 500, accuracy: 0.7 },
            medium: { reactionTime: 300, accuracy: 0.85 },
            hard: { reactionTime: 150, accuracy: 0.95 }
        };
    }

    createAISnake(difficulty = 'medium', personality = 'hunter') {
        const snake = new Snake(this.scene, new THREE.Vector3(
            (Math.random() - 0.5) * this.grid.width * 0.8,
            (Math.random() - 0.5) * this.grid.height * 0.8,
            0
        ));

        const behavior = this.createBehavior(personality, this.difficultyLevels[difficulty]);
        this.behaviors.set(snake.id, behavior);
        this.aiSnakes.set(snake.id, snake);

        return snake;
    }

    createBehavior(personality, settings) {
        switch (personality) {
            case 'hunter':
                return new HunterBehavior(settings);
            case 'survivor':
                return new SurvivorBehavior(settings);
            case 'collector':
                return new CollectorBehavior(settings);
            case 'aggressive':
                return new AggressiveBehavior(settings);
            default:
                return new HunterBehavior(settings);
        }
    }

    update(gameState, deltaTime) {
        this.aiSnakes.forEach((snake, id) => {
            const behavior = this.behaviors.get(id);
            if (behavior) {
                behavior.update(snake, gameState, deltaTime);
            }
        });
    }
}

class BaseBehavior {
    constructor(settings) {
        this.settings = settings;
        this.lastUpdateTime = 0;
    }

    canUpdate() {
        const now = Date.now();
        if (now - this.lastUpdateTime >= this.settings.reactionTime) {
            this.lastUpdateTime = now;
            return true;
        }
        return false;
    }

    addNoise(vector) {
        const noise = (1 - this.settings.accuracy) * (Math.random() - 0.5);
        return vector.clone().add(new THREE.Vector3(noise, noise, 0)).normalize();
    }
}

class HunterBehavior extends BaseBehavior {
    update(snake, gameState, deltaTime) {
        if (!this.canUpdate()) return;

        const nearestPellet = this.findNearestPellet(snake.head.position, gameState.pellets);
        if (nearestPellet) {
            const direction = new THREE.Vector3()
                .subVectors(nearestPellet.position, snake.head.position)
                .normalize();
            
            snake.setDirection(this.addNoise(direction));
        }
    }

    findNearestPellet(position, pellets) {
        let nearest = null;
        let minDistance = Infinity;

        pellets.forEach(pellet => {
            const distance = position.distanceTo(pellet.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = pellet;
            }
        });

        return nearest;
    }
}

class SurvivorBehavior extends BaseBehavior {
    update(snake, gameState, deltaTime) {
        if (!this.canUpdate()) return;

        const nearestThreat = this.findNearestThreat(snake, gameState);
        if (nearestThreat) {
            // Move away from threat
            const direction = new THREE.Vector3()
                .subVectors(snake.head.position, nearestThreat)
                .normalize();
            
            snake.setDirection(this.addNoise(direction));
        } else {
            // Default to hunter behavior when safe
            const hunterBehavior = new HunterBehavior(this.settings);
            hunterBehavior.update(snake, gameState, deltaTime);
        }
    }

    findNearestThreat(snake, gameState) {
        // Implementation for finding nearest threats (other snakes, walls, etc.)
    }
}

class CollectorBehavior extends BaseBehavior {
    update(snake, gameState, deltaTime) {
        if (!this.canUpdate()) return;

        // Prioritize power-ups over regular pellets
        const nearestPowerUp = this.findNearestPowerUp(snake.head.position, gameState.powerUps);
        if (nearestPowerUp) {
            const direction = new THREE.Vector3()
                .subVectors(nearestPowerUp.position, snake.head.position)
                .normalize();
            
            snake.setDirection(this.addNoise(direction));
            return;
        }

        // Default to hunter behavior
        const hunterBehavior = new HunterBehavior(this.settings);
        hunterBehavior.update(snake, gameState, deltaTime);
    }

    findNearestPowerUp(position, powerUps) {
        // Implementation for finding nearest power-up
    }
}

class AggressiveBehavior extends BaseBehavior {
    update(snake, gameState, deltaTime) {
        if (!this.canUpdate()) return;

        const nearestPlayer = this.findNearestPlayer(snake, gameState.players);
        if (nearestPlayer) {
            const direction = new THREE.Vector3()
                .subVectors(nearestPlayer.position, snake.head.position)
                .normalize();
            
            snake.setDirection(this.addNoise(direction));
        } else {
            // Default to hunter behavior when no players nearby
            const hunterBehavior = new HunterBehavior(this.settings);
            hunterBehavior.update(snake, gameState, deltaTime);
        }
    }

    findNearestPlayer(snake, players) {
        // Implementation for finding nearest player
    }
} 
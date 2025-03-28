class Bot extends Snake {
    constructor(game, options = {}) {
        super(game, {
            ...options,
            name: options.name || `Bot ${Math.floor(Math.random() * 1000)}`,
            isBot: true
        });
        
        // Bot state
        this.state = 'searching';  // searching, chasing, fleeing
        this.target = null;
        this.fleeingFrom = null;
        this.lastStateChange = performance.now();
        this.nextDecision = 0;
    }

    update(deltaTime) {
        // Update decision making at regular intervals
        if (performance.now() > this.nextDecision) {
            this.makeDecisions();
            this.nextDecision = performance.now() + CONFIG.BOT_DECISION_INTERVAL;
        }

        // Update target angle based on current state and target
        this.updateTargetAngle();

        // Call parent update
        super.update(deltaTime);
    }

    makeDecisions() {
        const now = performance.now();
        const timeSinceStateChange = now - this.lastStateChange;

        // Check for nearby threats
        const nearestThreat = this.findNearestThreat();
        if (nearestThreat && this.shouldFlee(nearestThreat)) {
            this.state = 'fleeing';
            this.fleeingFrom = nearestThreat;
            this.target = null;
            this.lastStateChange = now;
            return;
        }

        // If we've been in the same state for too long, consider changing
        if (timeSinceStateChange > CONFIG.BOT_STATE_CHANGE_TIME) {
            if (Math.random() < CONFIG.BOT_STATE_CHANGE_CHANCE) {
                this.state = 'searching';
                this.target = null;
                this.lastStateChange = now;
            }
        }

        // State-specific decision making
        switch (this.state) {
            case 'searching':
                const nearestPellet = this.findNearestPellet();
                if (nearestPellet) {
                    this.state = 'chasing';
                    this.target = nearestPellet;
                    this.lastStateChange = now;
                }
                break;

            case 'chasing':
                // If target is gone or too far, go back to searching
                if (!this.target || !this.game.pellets.includes(this.target)) {
                    this.state = 'searching';
                    this.target = null;
                    this.lastStateChange = now;
                }
                break;

            case 'fleeing':
                // If threat is gone or far enough, go back to searching
                if (!this.fleeingFrom || 
                    !this.game.snakes.includes(this.fleeingFrom) ||
                    !this.shouldFlee(this.fleeingFrom)) {
                    this.state = 'searching';
                    this.fleeingFrom = null;
                    this.lastStateChange = now;
                }
                break;
        }
    }

    updateTargetAngle() {
        let targetX, targetY;

        switch (this.state) {
            case 'searching':
                // Wander around
                if (!this.target || Math.random() < CONFIG.BOT_WANDER_CHANGE_CHANCE) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = CONFIG.BOT_WANDER_DISTANCE;
                    targetX = this.x + Math.cos(angle) * distance;
                    targetY = this.y + Math.sin(angle) * distance;
                    this.target = { x: targetX, y: targetY };
                }
                break;

            case 'chasing':
                if (this.target) {
                    targetX = this.target.x;
                    targetY = this.target.y;
                }
                break;

            case 'fleeing':
                if (this.fleeingFrom) {
                    // Move away from threat
                    const dx = this.x - this.fleeingFrom.x;
                    const dy = this.y - this.fleeingFrom.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    targetX = this.x + (dx / dist) * CONFIG.BOT_FLEE_DISTANCE;
                    targetY = this.y + (dy / dist) * CONFIG.BOT_FLEE_DISTANCE;
                }
                break;
        }

        if (targetX !== undefined && targetY !== undefined) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            this.targetAngle = Math.atan2(dy, dx);
        }

        // Decide whether to boost
        this.setBoost(this.shouldBoost());
    }

    findNearestPellet() {
        let nearest = null;
        let minDist = Infinity;

        for (const pellet of this.game.pellets) {
            const dx = pellet.x - this.x;
            const dy = pellet.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearest = pellet;
            }
        }

        return nearest;
    }

    findNearestThreat() {
        let nearest = null;
        let minDist = Infinity;

        for (const snake of this.game.snakes) {
            if (snake === this) continue;
            if (snake.length <= this.length) continue;

            const dx = snake.x - this.x;
            const dy = snake.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.BOT_THREAT_DISTANCE && dist < minDist) {
                minDist = dist;
                nearest = snake;
            }
        }

        return nearest;
    }

    shouldFlee(threat) {
        if (!threat) return false;

        const dx = threat.x - this.x;
        const dy = threat.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < CONFIG.BOT_THREAT_DISTANCE && threat.length > this.length;
    }

    shouldBoost() {
        switch (this.state) {
            case 'fleeing':
                return true;
            case 'chasing':
                return this.target && this.length > CONFIG.INITIAL_SNAKE_LENGTH * 2;
            default:
                return false;
        }
    }
} 
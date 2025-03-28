export class ScoringSystem {
    constructor(game) {
        this.game = game;
        this.currentScore = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.highScores = [];
        
        this.scoreConfig = {
            pellet: 100,
            powerUp: 250,
            elimination: 500,
            comboBonus: 50,
            comboTimeout: 3000, // ms
            multiplierThresholds: [
                { score: 1000, multiplier: 1.5 },
                { score: 2500, multiplier: 2.0 },
                { score: 5000, multiplier: 2.5 },
                { score: 10000, multiplier: 3.0 }
            ]
        };

        this.setupEventListeners();
        this.loadHighScores();
    }

    setupEventListeners() {
        this.game.events.on('pellet:collected', this.onPelletCollected.bind(this));
        this.game.events.on('powerup:collected', this.onPowerUpCollected.bind(this));
        this.game.events.on('player:eliminated', this.onPlayerEliminated.bind(this));
        this.game.events.on('combo:achieved', this.onComboAchieved.bind(this));
    }

    onPelletCollected(data) {
        const baseScore = this.scoreConfig.pellet;
        const bonus = this.calculateBonus(data);
        this.addScore(baseScore + bonus);
        this.incrementCombo();
    }

    onPowerUpCollected(data) {
        const baseScore = this.scoreConfig.powerUp;
        const bonus = this.calculateBonus(data);
        this.addScore(baseScore + bonus);
        this.incrementCombo();
    }

    onPlayerEliminated(data) {
        const baseScore = this.scoreConfig.elimination;
        const bonus = this.calculateBonus(data);
        this.addScore(baseScore + bonus);
        this.incrementCombo();
    }

    onComboAchieved(comboLevel) {
        const bonus = this.scoreConfig.comboBonus * comboLevel;
        this.addScore(bonus);
    }

    calculateBonus(data) {
        let bonus = 0;
        
        // Speed bonus
        if (data.speed > this.game.snake.baseSpeed) {
            bonus += (data.speed - this.game.snake.baseSpeed) * 10;
        }
        
        // Distance bonus
        if (data.distance) {
            bonus += Math.floor(data.distance * 5);
        }
        
        // Risk bonus (proximity to obstacles/enemies)
        if (data.risk) {
            bonus += data.risk * 20;
        }

        return bonus;
    }

    addScore(points) {
        const finalPoints = Math.floor(points * this.multiplier);
        this.currentScore += finalPoints;
        
        // Update multiplier based on total score
        this.updateMultiplier();
        
        // Show score popup
        this.game.ui.showScorePopup(finalPoints, this.combo > 1);
        
        // Check for high score
        if (this.currentScore > this.getLowestHighScore()) {
            this.game.events.emit('score:highscore', this.currentScore);
        }
    }

    incrementCombo() {
        this.combo++;
        this.comboTimer = Date.now();
        
        if (this.combo > 1) {
            this.game.events.emit('combo:achieved', this.combo);
            this.game.ui.updateCombo(this.combo);
        }
    }

    updateMultiplier() {
        const threshold = this.scoreConfig.multiplierThresholds
            .find(t => this.currentScore >= t.score);
        
        if (threshold) {
            this.multiplier = threshold.multiplier;
            this.game.ui.updateMultiplier(this.multiplier);
        }
    }

    update(deltaTime) {
        // Update combo timer
        if (this.combo > 0 && 
            Date.now() - this.comboTimer > this.scoreConfig.comboTimeout) {
            this.resetCombo();
        }
    }

    resetCombo() {
        if (this.combo > 1) {
            this.game.events.emit('combo:ended', this.combo);
        }
        this.combo = 0;
        this.game.ui.updateCombo(0);
    }

    saveHighScore() {
        const score = {
            points: this.currentScore,
            date: Date.now(),
            name: this.game.playerName || 'Anonymous',
            gameMode: this.game.currentMode,
            stats: this.getGameStats()
        };

        this.highScores.push(score);
        this.highScores.sort((a, b) => b.points - a.points);
        this.highScores = this.highScores.slice(0, 10); // Keep top 10

        localStorage.setItem('highScores', JSON.stringify(this.highScores));
    }

    loadHighScores() {
        const saved = localStorage.getItem('highScores');
        this.highScores = saved ? JSON.parse(saved) : [];
    }

    getLowestHighScore() {
        return this.highScores.length < 10 ? 0 : 
            this.highScores[this.highScores.length - 1].points;
    }

    getGameStats() {
        return {
            pellets: this.game.stats.pelletsCollected,
            powerUps: this.game.stats.powerUpsCollected,
            eliminations: this.game.stats.eliminations,
            maxCombo: this.game.stats.maxCombo,
            timeAlive: this.game.stats.timeAlive,
            distance: this.game.stats.distanceTraveled
        };
    }

    reset() {
        this.currentScore = 0;
        this.multiplier = 1;
        this.resetCombo();
    }
} 
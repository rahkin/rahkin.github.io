export class AnalyticsSystem {
    constructor(game) {
        this.game = game;
        this.stats = new Map();
        this.sessionData = new Map();
        this.events = [];
        
        this.setupMetrics();
        this.setupEventListeners();
        this.startSession();
    }

    setupMetrics() {
        this.metrics = {
            performance: {
                fps: [],
                frameTime: [],
                memory: []
            },
            gameplay: {
                scoreProgress: [],
                deaths: 0,
                killCount: 0,
                powerUpsCollected: 0,
                distanceTraveled: 0,
                timeAlive: 0,
                maxCombo: 0
            },
            progression: {
                level: 1,
                experience: 0,
                achievements: new Set(),
                unlockedItems: new Set()
            },
            behavioral: {
                playStyle: {
                    aggressive: 0,
                    defensive: 0,
                    strategic: 0
                },
                preferredPowerUps: new Map(),
                movementPatterns: [],
                decisionPoints: []
            }
        };
    }

    setupEventListeners() {
        // Performance events
        this.game.events.on('performance:update', this.trackPerformance.bind(this));
        
        // Gameplay events
        this.game.events.on('player:death', this.trackDeath.bind(this));
        this.game.events.on('player:kill', this.trackKill.bind(this));
        this.game.events.on('powerup:collected', this.trackPowerUp.bind(this));
        this.game.events.on('score:update', this.trackScore.bind(this));
        
        // Progression events
        this.game.events.on('level:complete', this.trackLevelProgress.bind(this));
        this.game.events.on('achievement:unlock', this.trackAchievement.bind(this));
        
        // Behavioral events
        this.game.events.on('player:action', this.trackAction.bind(this));
        this.game.events.on('player:decision', this.trackDecision.bind(this));
    }

    startSession() {
        this.sessionData.set('startTime', Date.now());
        this.sessionData.set('id', `session_${Date.now()}`);
        this.sessionData.set('platform', this.getPlatformInfo());
        this.sessionData.set('settings', this.game.settings);
    }

    getPlatformInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            devicePixelRatio: window.devicePixelRatio
        };
    }

    trackPerformance(data) {
        this.metrics.performance.fps.push({
            timestamp: Date.now(),
            value: data.fps
        });

        this.metrics.performance.frameTime.push({
            timestamp: Date.now(),
            value: data.frameTime
        });

        if (performance.memory) {
            this.metrics.performance.memory.push({
                timestamp: Date.now(),
                value: performance.memory.usedJSHeapSize
            });
        }

        // Keep only recent performance data
        this.prunePerformanceData();
    }

    trackDeath(data) {
        this.metrics.gameplay.deaths++;
        this.recordEvent('death', {
            position: data.position.toArray(),
            cause: data.cause,
            timeAlive: data.timeAlive
        });
    }

    trackKill(data) {
        this.metrics.gameplay.killCount++;
        this.recordEvent('kill', {
            position: data.position.toArray(),
            victim: data.victimId,
            method: data.method
        });
    }

    trackPowerUp(data) {
        this.metrics.gameplay.powerUpsCollected++;
        
        const count = this.metrics.behavioral.preferredPowerUps.get(data.type) || 0;
        this.metrics.behavioral.preferredPowerUps.set(data.type, count + 1);
        
        this.recordEvent('powerup', {
            type: data.type,
            position: data.position.toArray(),
            timeAlive: this.metrics.gameplay.timeAlive
        });
    }

    trackScore(score) {
        this.metrics.gameplay.scoreProgress.push({
            timestamp: Date.now(),
            value: score
        });
    }

    trackLevelProgress(data) {
        this.metrics.progression.level = data.level;
        this.metrics.progression.experience += data.experienceGained;
        
        this.recordEvent('level_complete', {
            level: data.level,
            score: data.score,
            time: data.time,
            stars: data.stars
        });
    }

    trackAchievement(data) {
        this.metrics.progression.achievements.add(data.id);
        this.recordEvent('achievement', {
            id: data.id,
            timestamp: Date.now()
        });
    }

    trackAction(data) {
        // Analyze play style based on actions
        if (data.type === 'attack') {
            this.metrics.behavioral.playStyle.aggressive += 1;
        } else if (data.type === 'defend') {
            this.metrics.behavioral.playStyle.defensive += 1;
        } else if (data.type === 'strategic') {
            this.metrics.behavioral.playStyle.strategic += 1;
        }

        this.recordEvent('action', {
            type: data.type,
            position: data.position.toArray(),
            timestamp: Date.now()
        });
    }

    trackDecision(data) {
        this.metrics.behavioral.decisionPoints.push({
            timestamp: Date.now(),
            type: data.type,
            context: data.context,
            outcome: data.outcome
        });
    }

    recordEvent(type, data) {
        this.events.push({
            type,
            data,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionData.get('startTime')
        });
    }

    prunePerformanceData() {
        const maxDataPoints = 1000;
        const metrics = this.metrics.performance;

        Object.values(metrics).forEach(array => {
            if (array.length > maxDataPoints) {
                array.splice(0, array.length - maxDataPoints);
            }
        });
    }

    generateReport() {
        const sessionDuration = Date.now() - this.sessionData.get('startTime');
        
        return {
            session: {
                id: this.sessionData.get('id'),
                duration: sessionDuration,
                platform: this.sessionData.get('platform'),
                settings: this.sessionData.get('settings')
            },
            performance: this.analyzePerformance(),
            gameplay: this.analyzeGameplay(),
            progression: this.analyzeProgression(),
            behavioral: this.analyzeBehavior(),
            events: this.events
        };
    }

    analyzePerformance() {
        const fps = this.metrics.performance.fps;
        return {
            averageFps: this.calculateAverage(fps.map(f => f.value)),
            fpsStability: this.calculateStability(fps.map(f => f.value)),
            memoryUsage: this.analyzeMemoryUsage(),
            frameTimeDistribution: this.analyzeFrameTime()
        };
    }

    analyzeGameplay() {
        return {
            scoreProgression: this.analyzeScoreProgression(),
            kdr: this.metrics.gameplay.killCount / 
                Math.max(1, this.metrics.gameplay.deaths),
            powerUpEfficiency: this.analyzePowerUpEfficiency(),
            survivalRate: this.calculateSurvivalRate()
        };
    }

    analyzeProgression() {
        return {
            level: this.metrics.progression.level,
            experience: this.metrics.progression.experience,
            achievementCompletion: this.calculateAchievementCompletion(),
            unlockProgress: this.calculateUnlockProgress()
        };
    }

    analyzeBehavior() {
        return {
            dominantPlayStyle: this.calculateDominantPlayStyle(),
            preferredPowerUps: this.analyzePowerUpPreferences(),
            decisionPatterns: this.analyzeDecisionPatterns(),
            movementHeatmap: this.generateHeatmap()
        };
    }

    calculateAverage(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateStability(values) {
        const avg = this.calculateAverage(values);
        const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / 
            values.length;
        return Math.sqrt(variance);
    }

    saveAnalytics() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    cleanup() {
        this.saveAnalytics();
        this.metrics = null;
        this.events = [];
        this.sessionData.clear();
    }
} 
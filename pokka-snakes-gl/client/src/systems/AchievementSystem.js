export class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.progress = new Map();
        this.listeners = new Map();
        
        this.setupAchievements();
        this.loadProgress();
    }

    setupAchievements() {
        // Movement achievements
        this.addAchievement('speedster', {
            title: 'Speed Demon',
            description: 'Reach maximum speed for 5 seconds',
            icon: '⚡',
            points: 20,
            secret: false,
            category: 'movement',
            requirements: {
                maxSpeed: 5,
                duration: 5000
            },
            check: (stats) => {
                return stats.speedDuration >= 5000;
            }
        });

        // Collection achievements
        this.addAchievement('collector', {
            title: 'Master Collector',
            description: 'Collect 1000 pellets',
            icon: '🔵',
            points: 50,
            secret: false,
            category: 'collection',
            requirements: {
                pellets: 1000
            },
            check: (stats) => {
                return stats.pelletsCollected >= 1000;
            }
        });

        // Survival achievements
        this.addAchievement('survivor', {
            title: 'Ultimate Survivor',
            description: 'Stay alive for 10 minutes',
            icon: '⏱️',
            points: 30,
            secret: false,
            category: 'survival',
            requirements: {
                time: 600000 // 10 minutes in milliseconds
            },
            check: (stats) => {
                return stats.survivalTime >= 600000;
            }
        });

        // Combat achievements
        this.addAchievement('warrior', {
            title: 'Snake Warrior',
            description: 'Defeat 50 enemy snakes',
            icon: '⚔️',
            points: 40,
            secret: false,
            category: 'combat',
            requirements: {
                defeats: 50
            },
            check: (stats) => {
                return stats.enemiesDefeated >= 50;
            }
        });

        // Secret achievements
        this.addAchievement('secret_master', {
            title: '???',
            description: 'Discover all secret areas',
            icon: '🔒',
            points: 100,
            secret: true,
            category: 'exploration',
            requirements: {
                areas: ['area1', 'area2', 'area3']
            },
            check: (stats) => {
                return stats.discoveredAreas.length >= 3;
            }
        });
    }

    addAchievement(id, config) {
        this.achievements.set(id, {
            id,
            ...config,
            unlocked: false,
            progress: 0,
            unlockTime: null
        });

        // Initialize progress tracking
        this.progress.set(id, 0);
    }

    updateProgress(id, value) {
        const achievement = this.achievements.get(id);
        if (!achievement || achievement.unlocked) return;

        const oldProgress = this.progress.get(id);
        const newProgress = Math.min(Math.max(value, 0), 1);
        this.progress.set(id, newProgress);

        if (newProgress !== oldProgress) {
            this.game.eventSystem.emit('achievementProgress', {
                id,
                progress: newProgress,
                oldProgress
            });

            if (newProgress >= 1) {
                this.unlock(id);
            }
        }
    }

    unlock(id) {
        const achievement = this.achievements.get(id);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        achievement.unlockTime = Date.now();
        this.unlockedAchievements.add(id);

        // Show notification
        this.showUnlockNotification(achievement);

        // Save progress
        this.saveProgress();

        // Emit event
        this.game.eventSystem.emit('achievementUnlocked', {
            id,
            achievement
        });

        // Update total score
        this.game.score += achievement.points;
    }

    showUnlockNotification(achievement) {
        const notification = {
            title: 'Achievement Unlocked!',
            message: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            points: achievement.points
        };

        this.game.ui.showAchievementNotification(notification);
    }

    check(stats) {
        this.achievements.forEach((achievement, id) => {
            if (!achievement.unlocked && achievement.check(stats)) {
                this.unlock(id);
            }
        });
    }

    getProgress(id) {
        return this.progress.get(id) || 0;
    }

    isUnlocked(id) {
        return this.unlockedAchievements.has(id);
    }

    getUnlockedCount() {
        return this.unlockedAchievements.size;
    }

    getTotalCount() {
        return this.achievements.size;
    }

    getTotalPoints() {
        let total = 0;
        this.unlockedAchievements.forEach(id => {
            const achievement = this.achievements.get(id);
            if (achievement) {
                total += achievement.points;
            }
        });
        return total;
    }

    getAchievementsByCategory(category) {
        return Array.from(this.achievements.values())
            .filter(achievement => achievement.category === category);
    }

    saveProgress() {
        const saveData = {
            unlockedAchievements: Array.from(this.unlockedAchievements),
            progress: Object.fromEntries(this.progress)
        };
        localStorage.setItem('achievements', JSON.stringify(saveData));
    }

    loadProgress() {
        const savedData = localStorage.getItem('achievements');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.unlockedAchievements = new Set(data.unlockedAchievements);
            this.progress = new Map(Object.entries(data.progress));

            // Update achievement unlock states
            this.unlockedAchievements.forEach(id => {
                const achievement = this.achievements.get(id);
                if (achievement) {
                    achievement.unlocked = true;
                }
            });
        }
    }

    reset() {
        this.unlockedAchievements.clear();
        this.progress.clear();
        this.achievements.forEach(achievement => {
            achievement.unlocked = false;
            achievement.progress = 0;
            achievement.unlockTime = null;
        });
        this.saveProgress();
    }
} 
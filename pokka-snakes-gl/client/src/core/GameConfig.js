export class GameConfig {
    static Difficulties = {
        easy: {
            speed: 0.08,
            initialLength: 3,
            growthRate: 1,
            pelletValue: 1,
            pelletSpawnRate: 3000,
            wallCollision: true,
            name: 'Easy'
        },
        medium: {
            speed: 0.12,
            initialLength: 5,
            growthRate: 1,
            pelletValue: 2,
            pelletSpawnRate: 2000,
            wallCollision: true,
            name: 'Medium'
        },
        hard: {
            speed: 0.16,
            initialLength: 7,
            growthRate: 2,
            pelletValue: 3,
            pelletSpawnRate: 1000,
            wallCollision: true,
            name: 'Hard'
        }
    };

    constructor(difficulty = 'medium') {
        this.setDifficulty(difficulty);
    }

    setDifficulty(difficulty) {
        const config = GameConfig.Difficulties[difficulty];
        if (!config) {
            throw new Error(`Invalid difficulty: ${difficulty}`);
        }
        
        Object.assign(this, config);
        this.currentDifficulty = difficulty;
    }

    getDifficultyName() {
        return GameConfig.Difficulties[this.currentDifficulty].name;
    }
} 
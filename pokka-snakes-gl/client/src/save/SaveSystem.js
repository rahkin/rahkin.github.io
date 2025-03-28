export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.saveKey = 'pokka-snakes-save';
        this.autoSaveInterval = 60000; // Auto-save every minute
        this.setupAutoSave();
    }

    setupAutoSave() {
        setInterval(() => this.autoSave(), this.autoSaveInterval);
        window.addEventListener('beforeunload', () => this.autoSave());
    }

    save() {
        const saveData = {
            version: '1.0',
            timestamp: Date.now(),
            player: this.serializePlayer(),
            gameState: this.serializeGameState(),
            settings: this.serializeSettings(),
            statistics: this.serializeStatistics(),
            achievements: Array.from(this.game.achievements),
            unlocks: this.serializeUnlocks()
        };

        try {
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            this.game.eventSystem.emit('saveComplete', { success: true });
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            this.game.eventSystem.emit('saveError', { error });
            return false;
        }
    }

    load() {
        try {
            const saveData = JSON.parse(localStorage.getItem(this.saveKey));
            if (!saveData) return false;

            // Version check
            if (this.isCompatibleVersion(saveData.version)) {
                this.deserializePlayer(saveData.player);
                this.deserializeGameState(saveData.gameState);
                this.deserializeSettings(saveData.settings);
                this.deserializeStatistics(saveData.statistics);
                this.deserializeAchievements(saveData.achievements);
                this.deserializeUnlocks(saveData.unlocks);

                this.game.eventSystem.emit('loadComplete', { success: true });
                return true;
            } else {
                throw new Error('Incompatible save version');
            }
        } catch (error) {
            console.error('Load failed:', error);
            this.game.eventSystem.emit('loadError', { error });
            return false;
        }
    }

    autoSave() {
        if (this.game.isPlaying) {
            this.save();
        }
    }

    serializePlayer() {
        const player = this.game.player;
        return {
            score: player.score,
            position: player.position.toArray(),
            inventory: player.inventory,
            abilities: player.abilities.map(ability => ({
                id: ability.id,
                level: ability.level,
                cooldown: ability.cooldown
            })),
            stats: player.stats
        };
    }

    serializeGameState() {
        return {
            level: this.game.currentLevel,
            difficulty: this.game.difficulty,
            timeElapsed: this.game.timeElapsed,
            powerUps: this.game.activePowerUps.map(powerUp => ({
                type: powerUp.type,
                duration: powerUp.duration,
                timeRemaining: powerUp.timeRemaining
            })),
            entities: this.serializeEntities()
        };
    }

    serializeEntities() {
        return Array.from(this.game.entities.values())
            .filter(entity => entity.persistent)
            .map(entity => ({
                id: entity.id,
                type: entity.type,
                position: entity.position.toArray(),
                state: entity.serialize?.() || {}
            }));
    }

    serializeSettings() {
        return {
            audio: {
                master: this.game.audioSystem.masterVolume,
                music: this.game.audioSystem.musicVolume,
                effects: this.game.audioSystem.effectsVolume
            },
            graphics: {
                quality: this.game.graphicsQuality,
                particles: this.game.particlesEnabled,
                postProcessing: this.game.postProcessingEnabled
            },
            controls: {
                sensitivity: this.game.controlSensitivity,
                bindings: Object.fromEntries(this.game.inputSystem.bindings)
            }
        };
    }

    serializeStatistics() {
        return {
            totalScore: this.game.statistics.totalScore,
            highScore: this.game.statistics.highScore,
            timePlayed: this.game.statistics.timePlayed,
            pelletsCollected: this.game.statistics.pelletsCollected,
            powerUpsCollected: this.game.statistics.powerUpsCollected,
            distanceTraveled: this.game.statistics.distanceTraveled,
            deaths: this.game.statistics.deaths
        };
    }

    serializeUnlocks() {
        return {
            skins: Array.from(this.game.unlockedSkins),
            abilities: Array.from(this.game.unlockedAbilities),
            levels: Array.from(this.game.unlockedLevels)
        };
    }

    deserializePlayer(data) {
        const player = this.game.player;
        player.score = data.score;
        player.position.fromArray(data.position);
        player.inventory = data.inventory;
        player.abilities = data.abilities.map(abilityData => 
            this.game.abilityFactory.create(abilityData.id, abilityData.level)
        );
        player.stats = data.stats;
    }

    deserializeGameState(data) {
        this.game.currentLevel = data.level;
        this.game.difficulty = data.difficulty;
        this.game.timeElapsed = data.timeElapsed;

        // Restore power-ups
        data.powerUps.forEach(powerUpData => {
            this.game.addPowerUp(
                powerUpData.type,
                powerUpData.duration,
                powerUpData.timeRemaining
            );
        });

        // Restore entities
        data.entities.forEach(entityData => {
            const entity = this.game.entityFactory.create(entityData.type);
            entity.id = entityData.id;
            entity.position.fromArray(entityData.position);
            entity.deserialize?.(entityData.state);
            this.game.addEntity(entity);
        });
    }

    deserializeSettings(data) {
        // Audio settings
        this.game.audioSystem.setMasterVolume(data.audio.master);
        this.game.audioSystem.setMusicVolume(data.audio.music);
        this.game.audioSystem.setEffectsVolume(data.audio.effects);

        // Graphics settings
        this.game.setGraphicsQuality(data.graphics.quality);
        this.game.setParticlesEnabled(data.graphics.particles);
        this.game.setPostProcessingEnabled(data.graphics.postProcessing);

        // Control settings
        this.game.setControlSensitivity(data.controls.sensitivity);
        Object.entries(data.controls.bindings).forEach(([action, keys]) => {
            this.game.inputSystem.bindings.set(action, new Set(keys));
        });
    }

    deserializeStatistics(data) {
        Object.assign(this.game.statistics, data);
    }

    deserializeAchievements(achievements) {
        this.game.achievements = new Set(achievements);
    }

    deserializeUnlocks(data) {
        this.game.unlockedSkins = new Set(data.skins);
        this.game.unlockedAbilities = new Set(data.abilities);
        this.game.unlockedLevels = new Set(data.levels);
    }

    isCompatibleVersion(version) {
        const current = '1.0';
        return version === current;
    }

    exportSave() {
        const saveData = localStorage.getItem(this.saveKey);
        if (!saveData) return null;

        const blob = new Blob([saveData], { type: 'application/json' });
        return URL.createObjectURL(blob);
    }

    async importSave(file) {
        try {
            const text = await file.text();
            const saveData = JSON.parse(text);
            
            if (this.isCompatibleVersion(saveData.version)) {
                localStorage.setItem(this.saveKey, text);
                return this.load();
            } else {
                throw new Error('Incompatible save version');
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.game.eventSystem.emit('importError', { error });
            return false;
        }
    }

    deleteSave() {
        try {
            localStorage.removeItem(this.saveKey);
            this.game.eventSystem.emit('saveDeleted');
            return true;
        } catch (error) {
            console.error('Delete failed:', error);
            return false;
        }
    }
} 
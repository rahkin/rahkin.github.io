export class ReplaySystem {
    constructor(game) {
        this.game = game;
        this.recording = false;
        this.frames = [];
        this.currentFrame = 0;
        this.playbackSpeed = 1;
        
        this.recordingConfig = {
            frameRate: 60,
            maxDuration: 300, // 5 minutes
            compressionLevel: 'high'
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.game.events.on('game:start', () => this.startRecording());
        this.game.events.on('game:end', () => this.stopRecording());
        this.game.events.on('game:state', (state) => this.recordState(state));
    }

    startRecording() {
        this.recording = true;
        this.frames = [];
        this.recordMetadata();
    }

    stopRecording() {
        this.recording = false;
        this.compressReplay();
        this.saveReplay();
    }

    recordMetadata() {
        this.metadata = {
            timestamp: Date.now(),
            gameMode: this.game.currentMode,
            playerName: this.game.playerName,
            version: this.game.version,
            settings: this.game.settings,
            seed: this.game.seed
        };
    }

    recordState(state) {
        if (!this.recording) return;

        const frame = {
            timestamp: Date.now(),
            players: this.capturePlayerStates(),
            entities: this.captureEntityStates(),
            events: this.captureEvents(),
            score: this.game.score,
            deltaTime: this.game.deltaTime
        };

        this.frames.push(this.compressFrame(frame));

        // Limit recording duration
        if (this.frames.length > this.recordingConfig.frameRate * 
            this.recordingConfig.maxDuration) {
            this.frames.shift();
        }
    }

    capturePlayerStates() {
        const states = new Map();
        this.game.players.forEach(player => {
            states.set(player.id, {
                position: player.position.toArray(),
                rotation: player.rotation.toArray(),
                velocity: player.velocity.toArray(),
                size: player.size,
                health: player.health,
                powerUps: Array.from(player.activePowerUps.entries())
            });
        });
        return states;
    }

    captureEntityStates() {
        const states = new Map();
        this.game.entities.forEach(entity => {
            states.set(entity.id, {
                type: entity.type,
                position: entity.position.toArray(),
                rotation: entity.rotation.toArray(),
                state: entity.getState()
            });
        });
        return states;
    }

    captureEvents() {
        return this.game.events.getRecentEvents();
    }

    compressFrame(frame) {
        if (this.recordingConfig.compressionLevel === 'high') {
            return {
                t: frame.timestamp,
                p: this.compressPlayerStates(frame.players),
                e: this.compressEntityStates(frame.entities),
                v: this.compressEvents(frame.events),
                s: frame.score,
                d: frame.deltaTime
            };
        }
        return frame;
    }

    compressPlayerStates(states) {
        const compressed = new Map();
        states.forEach((state, id) => {
            compressed.set(id, {
                p: state.position.map(v => Math.round(v * 100) / 100),
                r: state.rotation.map(v => Math.round(v * 100) / 100),
                v: state.velocity.map(v => Math.round(v * 100) / 100),
                s: Math.round(state.size * 100) / 100,
                h: Math.round(state.health),
                u: state.powerUps
            });
        });
        return compressed;
    }

    compressEntityStates(states) {
        const compressed = new Map();
        states.forEach((state, id) => {
            compressed.set(id, {
                t: state.type,
                p: state.position.map(v => Math.round(v * 100) / 100),
                r: state.rotation.map(v => Math.round(v * 100) / 100),
                s: state.state
            });
        });
        return compressed;
    }

    compressEvents(events) {
        return events.map(event => ({
            t: event.type,
            d: event.data,
            ts: event.timestamp
        }));
    }

    saveReplay() {
        const replay = {
            metadata: this.metadata,
            frames: this.frames
        };

        const blob = new Blob([JSON.stringify(replay)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `replay_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    loadReplay(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const replay = JSON.parse(e.target.result);
                    this.validateReplay(replay);
                    this.frames = replay.frames;
                    this.metadata = replay.metadata;
                    resolve(replay);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    validateReplay(replay) {
        if (!replay.metadata || !replay.frames || !Array.isArray(replay.frames)) {
            throw new Error('Invalid replay format');
        }
    }

    playReplay(speed = 1) {
        if (this.frames.length === 0) return;

        this.playbackSpeed = speed;
        this.currentFrame = 0;
        this.game.setState(this.metadata.settings);
        
        this.playbackInterval = setInterval(() => {
            this.updateReplayFrame();
        }, 1000 / (this.recordingConfig.frameRate * speed));
    }

    updateReplayFrame() {
        if (this.currentFrame >= this.frames.length) {
            this.stopReplayPlayback();
            return;
        }

        const frame = this.decompressFrame(this.frames[this.currentFrame]);
        this.applyFrame(frame);
        this.currentFrame++;
    }

    decompressFrame(frame) {
        if (this.recordingConfig.compressionLevel === 'high') {
            return {
                timestamp: frame.t,
                players: this.decompressPlayerStates(frame.p),
                entities: this.decompressEntityStates(frame.e),
                events: this.decompressEvents(frame.v),
                score: frame.s,
                deltaTime: frame.d
            };
        }
        return frame;
    }

    applyFrame(frame) {
        // Update player states
        frame.players.forEach((state, id) => {
            const player = this.game.players.get(id);
            if (player) {
                player.position.fromArray(state.position);
                player.rotation.fromArray(state.rotation);
                player.velocity.fromArray(state.velocity);
                player.size = state.size;
                player.health = state.health;
                player.activePowerUps = new Map(state.powerUps);
            }
        });

        // Update entity states
        frame.entities.forEach((state, id) => {
            const entity = this.game.entities.get(id);
            if (entity) {
                entity.position.fromArray(state.position);
                entity.rotation.fromArray(state.rotation);
                entity.setState(state.state);
            }
        });

        // Apply events
        frame.events.forEach(event => {
            this.game.events.emit(event.type, event.data);
        });

        // Update score
        this.game.score = frame.score;
    }

    stopReplayPlayback() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    cleanup() {
        this.stopRecording();
        this.stopReplayPlayback();
        this.frames = [];
    }
} 
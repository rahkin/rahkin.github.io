export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.players = new Map();
        this.latency = 0;
        this.serverTimeOffset = 0;
        this.updateRate = 60; // Updates per second
        this.interpolationDelay = 100; // ms
        this.predictionEnabled = true;
        
        this.setupNetworkState();
    }

    setupNetworkState() {
        this.networkState = {
            lastProcessedInput: 0,
            pendingInputs: [],
            serverSnapshots: [],
            entityBuffer: new Map(),
            reconciliationQueue: []
        };
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            this.socket = io(serverUrl, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            this.setupEventHandlers();
            
            this.socket.on('connect', () => {
                this.startNetworkLoop();
                this.synchronizeTime();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                reject(error);
            });
        });
    }

    setupEventHandlers() {
        // Player events
        this.socket.on('player:join', this.handlePlayerJoin.bind(this));
        this.socket.on('player:leave', this.handlePlayerLeave.bind(this));
        this.socket.on('player:update', this.handlePlayerUpdate.bind(this));
        
        // Game state events
        this.socket.on('game:state', this.handleGameState.bind(this));
        this.socket.on('game:snapshot', this.handleGameSnapshot.bind(this));
        
        // Entity events
        this.socket.on('entity:spawn', this.handleEntitySpawn.bind(this));
        this.socket.on('entity:destroy', this.handleEntityDestroy.bind(this));
        
        // Synchronization events
        this.socket.on('sync:time', this.handleTimeSync.bind(this));
        this.socket.on('sync:pong', this.handlePong.bind(this));
    }

    startNetworkLoop() {
        this.networkLoop = setInterval(() => {
            this.sendPlayerState();
            this.reconcileGameState();
        }, 1000 / this.updateRate);
    }

    sendPlayerState() {
        if (!this.socket || !this.game.snake) return;

        const input = {
            sequence: ++this.networkState.lastProcessedInput,
            timestamp: this.getNetworkTime(),
            position: this.game.snake.position.toArray(),
            rotation: this.game.snake.rotation.toArray(),
            velocity: this.game.snake.velocity.toArray(),
            actions: this.game.snake.getActions()
        };

        if (this.predictionEnabled) {
            this.networkState.pendingInputs.push(input);
        }

        this.socket.emit('player:input', input);
    }

    handlePlayerJoin(data) {
        const player = this.createNetworkPlayer(data);
        this.players.set(data.id, player);
        this.game.events.emit('player:joined', player);
    }

    handlePlayerLeave(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.players.delete(playerId);
            this.game.events.emit('player:left', player);
            player.cleanup();
        }
    }

    handlePlayerUpdate(data) {
        const player = this.players.get(data.id);
        if (!player) return;

        if (this.predictionEnabled) {
            this.reconcilePlayerState(player, data);
        } else {
            this.interpolatePlayerState(player, data);
        }
    }

    reconcilePlayerState(player, serverState) {
        // Client-side prediction reconciliation
        const pendingInputs = this.networkState.pendingInputs;
        
        // Remove processed inputs
        while (pendingInputs.length > 0 && 
               pendingInputs[0].sequence <= serverState.lastProcessedInput) {
            pendingInputs.shift();
        }

        // Check if prediction was correct
        if (this.shouldReconcile(player, serverState)) {
            // Reset to server state
            player.position.fromArray(serverState.position);
            player.rotation.fromArray(serverState.rotation);
            player.velocity.fromArray(serverState.velocity);

            // Reapply pending inputs
            pendingInputs.forEach(input => {
                this.game.physics.applyInput(player, input);
            });
        }
    }

    interpolatePlayerState(player, serverState) {
        const timestamp = this.getNetworkTime();
        const buffer = this.getEntityBuffer(player.id);

        // Add state to buffer
        buffer.push({
            timestamp: serverState.timestamp,
            state: serverState
        });

        // Remove old states
        while (buffer.length > 0 && 
               buffer[0].timestamp < timestamp - 1000) {
            buffer.shift();
        }

        // Interpolate between two closest states
        const renderTimestamp = timestamp - this.interpolationDelay;
        const [state1, state2] = this.findInterpolationStates(buffer, renderTimestamp);

        if (state1 && state2) {
            const alpha = (renderTimestamp - state1.timestamp) / 
                         (state2.timestamp - state1.timestamp);
            
            this.interpolateState(player, state1.state, state2.state, alpha);
        }
    }

    handleGameState(state) {
        // Full game state update
        this.game.setState(state);
        
        // Reset reconciliation queue
        this.networkState.reconciliationQueue = [];
        
        // Update all entities
        state.entities.forEach(entityState => {
            this.updateEntityState(entityState);
        });
    }

    handleGameSnapshot(snapshot) {
        const timestamp = this.getNetworkTime();
        
        // Add snapshot to buffer
        this.networkState.serverSnapshots.push({
            timestamp: snapshot.timestamp,
            state: snapshot
        });

        // Remove old snapshots
        while (this.networkState.serverSnapshots.length > 0 && 
               this.networkState.serverSnapshots[0].timestamp < timestamp - 1000) {
            this.networkState.serverSnapshots.shift();
        }

        // Queue state updates for reconciliation
        snapshot.updates.forEach(update => {
            this.networkState.reconciliationQueue.push({
                timestamp: snapshot.timestamp,
                update: update
            });
        });
    }

    reconcileGameState() {
        const timestamp = this.getNetworkTime();
        const queue = this.networkState.reconciliationQueue;

        // Process updates that are ready
        while (queue.length > 0 && queue[0].timestamp <= timestamp) {
            const update = queue.shift().update;
            this.processStateUpdate(update);
        }
    }

    processStateUpdate(update) {
        switch (update.type) {
            case 'entity':
                this.updateEntityState(update.data);
                break;
            case 'collision':
                this.handleCollision(update.data);
                break;
            case 'score':
                this.updateScore(update.data);
                break;
            // Add more update types as needed
        }
    }

    handleEntitySpawn(data) {
        const entity = this.createNetworkEntity(data);
        this.networkState.entityBuffer.set(data.id, []);
        this.game.addEntity(entity);
    }

    handleEntityDestroy(entityId) {
        this.game.removeEntity(entityId);
        this.networkState.entityBuffer.delete(entityId);
    }

    synchronizeTime() {
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, 1000);
    }

    sendPing() {
        const pingData = {
            clientTime: Date.now()
        };
        this.socket.emit('sync:ping', pingData);
    }

    handlePong(data) {
        const now = Date.now();
        const latency = (now - data.clientTime) / 2;
        const serverTime = data.serverTime + latency;
        
        this.latency = latency;
        this.serverTimeOffset = serverTime - now;
    }

    getNetworkTime() {
        return Date.now() + this.serverTimeOffset;
    }

    getEntityBuffer(entityId) {
        if (!this.networkState.entityBuffer.has(entityId)) {
            this.networkState.entityBuffer.set(entityId, []);
        }
        return this.networkState.entityBuffer.get(entityId);
    }

    findInterpolationStates(buffer, timestamp) {
        let state1 = null;
        let state2 = null;

        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i].timestamp <= timestamp) {
                state1 = buffer[i];
                state2 = buffer[i + 1] || null;
            }
        }

        return [state1, state2];
    }

    interpolateState(entity, state1, state2, alpha) {
        // Position interpolation
        entity.position.lerpVectors(
            new THREE.Vector3().fromArray(state1.position),
            new THREE.Vector3().fromArray(state2.position),
            alpha
        );

        // Rotation interpolation
        entity.rotation.slerpQuaternions(
            new THREE.Quaternion().fromArray(state1.rotation),
            new THREE.Quaternion().fromArray(state2.rotation),
            alpha
        );

        // Velocity interpolation
        entity.velocity.lerpVectors(
            new THREE.Vector3().fromArray(state1.velocity),
            new THREE.Vector3().fromArray(state2.velocity),
            alpha
        );
    }

    shouldReconcile(entity, serverState) {
        const positionError = new THREE.Vector3()
            .fromArray(serverState.position)
            .sub(entity.position)
            .length();

        const velocityError = new THREE.Vector3()
            .fromArray(serverState.velocity)
            .sub(entity.velocity)
            .length();

        return positionError > 0.1 || velocityError > 0.1;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.networkLoop) {
            clearInterval(this.networkLoop);
        }

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.players.clear();
        this.networkState.entityBuffer.clear();
        this.networkState.serverSnapshots = [];
        this.networkState.reconciliationQueue = [];
    }

    cleanup() {
        this.disconnect();
        this.players.forEach(player => player.cleanup());
        this.players.clear();
    }
} 
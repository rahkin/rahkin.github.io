export class NetworkServer {
    constructor(io) {
        this.io = io;
        this.players = new Map();
        this.rooms = new Map();
        this.gameStates = new Map();
        this.updateRate = 60;
        
        this.setupEventHandlers();
        this.startUpdateLoop();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handlePlayerConnection(socket);

            socket.on('disconnect', () => {
                this.handlePlayerDisconnection(socket);
            });

            socket.on('player:input', (data) => {
                this.handlePlayerInput(socket, data);
            });

            socket.on('sync:ping', (data) => {
                this.handlePing(socket, data);
            });

            socket.on('room:join', (roomId) => {
                this.handleRoomJoin(socket, roomId);
            });

            socket.on('room:leave', () => {
                this.handleRoomLeave(socket);
            });
        });
    }

    handlePlayerConnection(socket) {
        const player = {
            id: socket.id,
            socket: socket,
            room: null,
            state: this.createInitialPlayerState(),
            lastProcessedInput: 0
        };

        this.players.set(socket.id, player);
        this.broadcastPlayerJoin(player);
    }

    handlePlayerDisconnection(socket) {
        const player = this.players.get(socket.id);
        if (player) {
            if (player.room) {
                this.handleRoomLeave(socket);
            }
            this.players.delete(socket.id);
            this.broadcastPlayerLeave(player);
        }
    }

    handlePlayerInput(socket, input) {
        const player = this.players.get(socket.id);
        if (!player) return;

        // Validate input
        if (!this.validateInput(input)) return;

        // Process input
        this.processPlayerInput(player, input);

        // Update last processed input
        player.lastProcessedInput = input.sequence;

        // Broadcast immediate updates for critical actions
        if (this.isInputCritical(input)) {
            this.broadcastPlayerUpdate(player);
        }
    }

    handlePing(socket, data) {
        socket.emit('sync:pong', {
            clientTime: data.clientTime,
            serverTime: Date.now()
        });
    }

    handleRoomJoin(socket, roomId) {
        const player = this.players.get(socket.id);
        if (!player) return;

        // Leave current room if any
        if (player.room) {
            this.handleRoomLeave(socket);
        }

        // Get or create room
        let room = this.rooms.get(roomId);
        if (!room) {
            room = this.createRoom(roomId);
            this.rooms.set(roomId, room);
        }

        // Join room
        player.room = room;
        socket.join(roomId);
        room.players.add(player);

        // Send room state to player
        this.sendRoomState(player);

        // Broadcast join to room
        this.broadcastToRoom(room, 'player:join', {
            id: player.id,
            state: player.state
        });
    }

    handleRoomLeave(socket) {
        const player = this.players.get(socket.id);
        if (!player || !player.room) return;

        const room = player.room;
        room.players.delete(player);
        socket.leave(room.id);

        // Broadcast leave to room
        this.broadcastToRoom(room, 'player:leave', player.id);

        // Cleanup empty room
        if (room.players.size === 0) {
            this.rooms.delete(room.id);
        }

        player.room = null;
    }

    startUpdateLoop() {
        setInterval(() => {
            this.update();
        }, 1000 / this.updateRate);
    }

    update() {
        const timestamp = Date.now();

        // Update each room
        this.rooms.forEach(room => {
            // Update game state
            this.updateGameState(room);

            // Create snapshot
            const snapshot = this.createSnapshot(room);

            // Send snapshot to all players in room
            this.broadcastToRoom(room, 'game:snapshot', snapshot);
        });
    }

    updateGameState(room) {
        const state = this.gameStates.get(room.id);
        if (!state) return;

        // Update entities
        state.entities.forEach(entity => {
            this.updateEntity(entity);
        });

        // Check collisions
        this.checkCollisions(state);

        // Update scores
        this.updateScores(state);
    }

    createSnapshot(room) {
        const state = this.gameStates.get(room.id);
        return {
            timestamp: Date.now(),
            players: Array.from(room.players).map(player => ({
                id: player.id,
                state: player.state,
                lastProcessedInput: player.lastProcessedInput
            })),
            entities: state.entities,
            updates: state.updates
        };
    }

    broadcastToRoom(room, event, data) {
        this.io.to(room.id).emit(event, data);
    }

    broadcastPlayerJoin(player) {
        if (player.room) {
            this.broadcastToRoom(player.room, 'player:join', {
                id: player.id,
                state: player.state
            });
        }
    }

    broadcastPlayerLeave(player) {
        if (player.room) {
            this.broadcastToRoom(player.room, 'player:leave', player.id);
        }
    }

    broadcastPlayerUpdate(player) {
        if (player.room) {
            this.broadcastToRoom(player.room, 'player:update', {
                id: player.id,
                state: player.state,
                lastProcessedInput: player.lastProcessedInput
            });
        }
    }

    createRoom(id) {
        const room = {
            id: id,
            players: new Set(),
            settings: this.getDefaultRoomSettings()
        };

        this.gameStates.set(id, this.createInitialGameState());
        return room;
    }

    cleanup() {
        this.players.clear();
        this.rooms.clear();
        this.gameStates.clear();
    }
} 
export class LevelGenerationSystem {
    constructor(game) {
        this.game = game;
        this.levels = new Map();
        this.currentLevel = null;
        this.rooms = [];
        this.corridors = [];
        this.obstacles = [];
        
        this.config = {
            roomSize: {
                min: 10,
                max: 20
            },
            corridorWidth: 3,
            levelSize: 100,
            roomCount: {
                min: 5,
                max: 8
            },
            obstacleTypes: ['static', 'moving', 'destructible'],
            themes: ['default', 'ice', 'lava', 'space']
        };

        this.setupTemplates();
    }

    setupTemplates() {
        // Room templates
        this.roomTemplates = {
            standard: {
                create: (size) => this.createStandardRoom(size),
                decorations: ['pillars', 'lights', 'plants']
            },
            arena: {
                create: (size) => this.createArenaRoom(size),
                decorations: ['platforms', 'barriers', 'spawners']
            },
            puzzle: {
                create: (size) => this.createPuzzleRoom(size),
                decorations: ['switches', 'gates', 'triggers']
            },
            boss: {
                create: (size) => this.createBossRoom(size),
                decorations: ['throne', 'artifacts', 'portals']
            }
        };

        // Obstacle templates
        this.obstacleTemplates = {
            static: {
                geometry: new THREE.BoxGeometry(2, 4, 2),
                material: new THREE.MeshPhongMaterial({ color: 0x808080 }),
                collider: 'box'
            },
            moving: {
                geometry: new THREE.CylinderGeometry(1, 1, 4),
                material: new THREE.MeshPhongMaterial({ color: 0xff0000 }),
                collider: 'cylinder',
                behavior: 'patrol'
            },
            destructible: {
                geometry: new THREE.BoxGeometry(2, 2, 2),
                material: new THREE.MeshPhongMaterial({ color: 0x8b4513 }),
                collider: 'box',
                health: 100
            }
        };
    }

    generateLevel(difficulty = 1, theme = 'default') {
        this.clearCurrentLevel();
        
        const levelId = `level-${Date.now()}`;
        const level = {
            id: levelId,
            difficulty,
            theme,
            rooms: [],
            corridors: [],
            obstacles: [],
            powerUpSpawns: [],
            enemySpawns: []
        };

        // Generate rooms
        this.generateRooms(level);
        
        // Connect rooms with corridors
        this.connectRooms(level);
        
        // Add obstacles and decorations
        this.addObstacles(level);
        
        // Add spawn points
        this.addSpawnPoints(level);
        
        // Apply theme
        this.applyTheme(level, theme);
        
        // Create navigation mesh
        this.createNavMesh(level);

        this.levels.set(levelId, level);
        this.currentLevel = level;
        
        return level;
    }

    generateRooms(level) {
        const roomCount = THREE.MathUtils.randInt(
            this.config.roomCount.min,
            this.config.roomCount.max
        );

        for (let i = 0; i < roomCount; i++) {
            let room = this.createRoom();
            let attempts = 0;
            const maxAttempts = 50;

            while (this.roomOverlaps(room, level.rooms) && attempts < maxAttempts) {
                room = this.createRoom();
                attempts++;
            }

            if (attempts < maxAttempts) {
                const template = this.selectRoomTemplate(i, roomCount);
                room.mesh = template.create(room.size);
                room.decorations = template.decorations;
                level.rooms.push(room);
            }
        }
    }

    createRoom() {
        const width = THREE.MathUtils.randFloat(
            this.config.roomSize.min,
            this.config.roomSize.max
        );
        const length = THREE.MathUtils.randFloat(
            this.config.roomSize.min,
            this.config.roomSize.max
        );

        return {
            position: new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(this.config.levelSize),
                0,
                THREE.MathUtils.randFloatSpread(this.config.levelSize)
            ),
            size: new THREE.Vector2(width, length),
            connections: []
        };
    }

    selectRoomTemplate(index, totalRooms) {
        if (index === 0) return this.roomTemplates.standard; // Starting room
        if (index === totalRooms - 1) return this.roomTemplates.boss; // Boss room
        
        const templates = [
            this.roomTemplates.standard,
            this.roomTemplates.arena,
            this.roomTemplates.puzzle
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }

    connectRooms(level) {
        const delaunay = this.createDelaunayTriangulation(level.rooms);
        const mst = this.createMinimumSpanningTree(delaunay);
        
        mst.forEach(edge => {
            const corridor = this.createCorridor(
                level.rooms[edge.from],
                level.rooms[edge.to]
            );
            level.corridors.push(corridor);
        });
    }

    createCorridor(roomA, roomB) {
        const start = roomA.position.clone();
        const end = roomB.position.clone();
        
        const corridor = {
            start,
            end,
            width: this.config.corridorWidth,
            mesh: this.createCorridorMesh(start, end)
        };

        roomA.connections.push(roomB);
        roomB.connections.push(roomA);

        return corridor;
    }

    addObstacles(level) {
        level.rooms.forEach(room => {
            const obstacleCount = Math.floor(room.size.x * room.size.y / 20);
            
            for (let i = 0; i < obstacleCount; i++) {
                const obstacle = this.createObstacle(room);
                if (obstacle) {
                    level.obstacles.push(obstacle);
                }
            }
        });
    }

    createObstacle(room) {
        const type = this.config.obstacleTypes[
            Math.floor(Math.random() * this.config.obstacleTypes.length)
        ];
        
        const template = this.obstacleTemplates[type];
        if (!template) return null;

        const position = new THREE.Vector3(
            room.position.x + THREE.MathUtils.randFloatSpread(room.size.x * 0.8),
            0,
            room.position.z + THREE.MathUtils.randFloatSpread(room.size.y * 0.8)
        );

        const obstacle = {
            type,
            position,
            template,
            mesh: new THREE.Mesh(template.geometry, template.material.clone())
        };

        obstacle.mesh.position.copy(position);
        
        if (template.behavior) {
            this.addObstacleBehavior(obstacle, template.behavior);
        }

        return obstacle;
    }

    addObstacleBehavior(obstacle, behavior) {
        switch (behavior) {
            case 'patrol':
                obstacle.behavior = {
                    type: 'patrol',
                    points: this.generatePatrolPoints(obstacle.position),
                    currentPoint: 0,
                    speed: 2
                };
                break;
            case 'rotate':
                obstacle.behavior = {
                    type: 'rotate',
                    axis: new THREE.Vector3(0, 1, 0),
                    speed: Math.PI / 2
                };
                break;
            // Add more behaviors as needed
        }
    }

    generatePatrolPoints(center) {
        const points = [];
        const radius = 5;
        const count = 4;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            points.push(new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y,
                center.z + Math.sin(angle) * radius
            ));
        }

        return points;
    }

    addSpawnPoints(level) {
        level.rooms.forEach(room => {
            // Add power-up spawn points
            const powerUpSpawn = {
                position: room.position.clone().add(new THREE.Vector3(
                    THREE.MathUtils.randFloatSpread(room.size.x * 0.5),
                    0,
                    THREE.MathUtils.randFloatSpread(room.size.y * 0.5)
                )),
                type: 'powerUp'
            };
            level.powerUpSpawns.push(powerUpSpawn);

            // Add enemy spawn points
            const enemySpawn = {
                position: room.position.clone().add(new THREE.Vector3(
                    THREE.MathUtils.randFloatSpread(room.size.x * 0.5),
                    0,
                    THREE.MathUtils.randFloatSpread(room.size.y * 0.5)
                )),
                type: 'enemy'
            };
            level.enemySpawns.push(enemySpawn);
        });
    }

    applyTheme(level, theme) {
        const themeConfig = this.getThemeConfig(theme);
        
        // Apply materials
        level.rooms.forEach(room => {
            this.applyMaterial(room.mesh, themeConfig.materials.floor);
            this.addThemeDecorations(room, themeConfig);
        });

        level.corridors.forEach(corridor => {
            this.applyMaterial(corridor.mesh, themeConfig.materials.corridor);
        });

        level.obstacles.forEach(obstacle => {
            this.applyMaterial(obstacle.mesh, themeConfig.materials.obstacle);
        });

        // Add theme-specific lighting
        this.addThemeLighting(level, themeConfig);

        // Add particle effects
        this.addThemeParticles(level, themeConfig);
    }

    getThemeConfig(theme) {
        // Theme configurations
        const themes = {
            default: {
                materials: {
                    floor: new THREE.MeshPhongMaterial({ color: 0x808080 }),
                    corridor: new THREE.MeshPhongMaterial({ color: 0x606060 }),
                    obstacle: new THREE.MeshPhongMaterial({ color: 0x404040 })
                },
                lighting: {
                    ambient: { color: 0xffffff, intensity: 0.5 },
                    point: { color: 0xffffff, intensity: 1.0, distance: 20 }
                },
                particles: ['dust']
            },
            ice: {
                materials: {
                    floor: new THREE.MeshPhongMaterial({
                        color: 0xadd8e6,
                        shininess: 100
                    }),
                    corridor: new THREE.MeshPhongMaterial({
                        color: 0x87ceeb,
                        shininess: 100
                    }),
                    obstacle: new THREE.MeshPhongMaterial({
                        color: 0xf0f8ff,
                        shininess: 100
                    })
                },
                lighting: {
                    ambient: { color: 0xadd8e6, intensity: 0.7 },
                    point: { color: 0x87ceeb, intensity: 1.2, distance: 25 }
                },
                particles: ['snow', 'frost']
            },
            // Add more themes as needed
        };

        return themes[theme] || themes.default;
    }

    createNavMesh(level) {
        // Create navigation mesh for AI pathfinding
        const geometry = new THREE.Geometry();

        // Add room floors to navigation mesh
        level.rooms.forEach(room => {
            const roomGeom = new THREE.PlaneGeometry(room.size.x, room.size.y);
            roomGeom.rotateX(-Math.PI / 2);
            roomGeom.translate(room.position.x, 0, room.position.z);
            geometry.merge(roomGeom);
        });

        // Add corridors to navigation mesh
        level.corridors.forEach(corridor => {
            const corridorGeom = this.createCorridorGeometry(
                corridor.start,
                corridor.end,
                corridor.width
            );
            geometry.merge(corridorGeom);
        });

        // Create nav mesh
        const navMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ visible: false })
        );
        navMesh.userData.type = 'navmesh';
        
        level.navMesh = navMesh;
    }

    clearCurrentLevel() {
        if (this.currentLevel) {
            // Remove all meshes
            this.currentLevel.rooms.forEach(room => {
                this.game.scene.remove(room.mesh);
            });
            
            this.currentLevel.corridors.forEach(corridor => {
                this.game.scene.remove(corridor.mesh);
            });
            
            this.currentLevel.obstacles.forEach(obstacle => {
                this.game.scene.remove(obstacle.mesh);
            });

            // Clear arrays
            this.currentLevel.rooms = [];
            this.currentLevel.corridors = [];
            this.currentLevel.obstacles = [];
            this.currentLevel.powerUpSpawns = [];
            this.currentLevel.enemySpawns = [];
        }
    }

    update(deltaTime) {
        if (!this.currentLevel) return;

        // Update moving obstacles
        this.currentLevel.obstacles.forEach(obstacle => {
            if (obstacle.behavior) {
                this.updateObstacleBehavior(obstacle, deltaTime);
            }
        });
    }

    updateObstacleBehavior(obstacle, deltaTime) {
        switch (obstacle.behavior.type) {
            case 'patrol':
                this.updatePatrolBehavior(obstacle, deltaTime);
                break;
            case 'rotate':
                this.updateRotateBehavior(obstacle, deltaTime);
                break;
        }
    }

    updatePatrolBehavior(obstacle, deltaTime) {
        const behavior = obstacle.behavior;
        const target = behavior.points[behavior.currentPoint];
        const direction = target.clone().sub(obstacle.position).normalize();
        
        obstacle.position.add(direction.multiplyScalar(behavior.speed * deltaTime));
        obstacle.mesh.position.copy(obstacle.position);

        if (obstacle.position.distanceTo(target) < 0.1) {
            behavior.currentPoint = (behavior.currentPoint + 1) % behavior.points.length;
        }
    }

    updateRotateBehavior(obstacle, deltaTime) {
        const behavior = obstacle.behavior;
        obstacle.mesh.rotateOnAxis(behavior.axis, behavior.speed * deltaTime);
    }
} 
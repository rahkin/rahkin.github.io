import * as THREE from 'three';

export class LevelGenerator {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.powerUpSpawns = [];
        this.pelletSpawns = [];
    }

    generateLevel(complexity = 1) {
        this.clearLevel();
        
        // Generate base layout
        const layout = this.generateLayout(complexity);
        
        // Create obstacles
        this.createObstacles(layout);
        
        // Generate spawn points
        this.generateSpawnPoints(layout);
        
        return {
            obstacles: this.obstacles,
            powerUpSpawns: this.powerUpSpawns,
            pelletSpawns: this.pelletSpawns
        };
    }

    generateLayout(complexity) {
        const size = 30;
        const grid = Array(size).fill().map(() => Array(size).fill(0));
        
        // Generate rooms using cellular automata
        this.generateRooms(grid, complexity);
        
        // Create corridors between rooms
        this.createCorridors(grid);
        
        return grid;
    }

    generateRooms(grid, complexity) {
        // Initialize with random noise
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (Math.random() < 0.4) {
                    grid[y][x] = 1;
                }
            }
        }

        // Apply cellular automata rules
        for (let i = 0; i < 4; i++) {
            this.applyAutomataRules(grid);
        }
    }

    applyAutomataRules(grid) {
        const newGrid = grid.map(row => [...row]);

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const neighbors = this.countNeighbors(grid, x, y);
                if (grid[y][x] === 1) {
                    newGrid[y][x] = neighbors >= 4 ? 1 : 0;
                } else {
                    newGrid[y][x] = neighbors >= 5 ? 1 : 0;
                }
            }
        }

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                grid[y][x] = newGrid[y][x];
            }
        }
    }

    countNeighbors(grid, x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const ny = y + dy;
                const nx = x + dx;
                
                if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
                    count += grid[ny][nx];
                } else {
                    count += 1; // Count edges as walls
                }
            }
        }
        return count;
    }

    createCorridors(grid) {
        // Find rooms
        const rooms = this.findRooms(grid);
        
        // Connect rooms with corridors
        for (let i = 1; i < rooms.length; i++) {
            const start = rooms[i - 1];
            const end = rooms[i];
            this.createCorridor(grid, start, end);
        }
    }

    findRooms(grid) {
        const rooms = [];
        const visited = new Set();

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[y][x] === 1 && !visited.has(`${x},${y}`)) {
                    const room = this.floodFill(grid, x, y, visited);
                    if (room.length > 4) { // Minimum room size
                        rooms.push(this.getRoomCenter(room));
                    }
                }
            }
        }

        return rooms;
    }

    floodFill(grid, x, y, visited) {
        const room = [];
        const queue = [[x, y]];
        
        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const key = `${cx},${cy}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            room.push([cx, cy]);

            [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => {
                const nx = cx + dx;
                const ny = cy + dy;
                
                if (ny >= 0 && ny < grid.length && 
                    nx >= 0 && nx < grid[0].length && 
                    grid[ny][nx] === 1) {
                    queue.push([nx, ny]);
                }
            });
        }

        return room;
    }

    getRoomCenter(room) {
        const x = Math.floor(room.reduce((sum, [x]) => sum + x, 0) / room.length);
        const y = Math.floor(room.reduce((sum, [, y]) => sum + y, 0) / room.length);
        return [x, y];
    }

    createCorridor(grid, start, end) {
        const [x1, y1] = start;
        const [x2, y2] = end;
        
        // Create L-shaped corridor
        const midX = x1;
        const midY = y2;
        
        this.drawLine(grid, x1, y1, midX, midY);
        this.drawLine(grid, midX, midY, x2, y2);
    }

    drawLine(grid, x1, y1, x2, y2) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        
        let x = x1;
        let y = y1;
        
        while (x !== x2 || y !== y2) {
            grid[y][x] = 1;
            if (x !== x2) x += dx;
            if (y !== y2) y += dy;
        }
        grid[y2][x2] = 1;
    }

    createObstacles(layout) {
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                if (layout[y][x] === 0) {
                    const position = new THREE.Vector3(
                        x - layout.length / 2,
                        y - layout[0].length / 2,
                        0
                    );
                    this.createObstacle(position);
                }
            }
        }
    }

    createObstacle(position) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.8
        });
        
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.copy(position);
        
        this.obstacles.push(obstacle);
        this.scene.add(obstacle);
    }

    generateSpawnPoints(layout) {
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                if (layout[y][x] === 1) {
                    const position = new THREE.Vector3(
                        x - layout.length / 2,
                        y - layout[0].length / 2,
                        0
                    );
                    
                    if (Math.random() < 0.1) {
                        this.powerUpSpawns.push(position.clone());
                    } else {
                        this.pelletSpawns.push(position.clone());
                    }
                }
            }
        }
    }

    clearLevel() {
        this.obstacles.forEach(obstacle => {
            this.scene.remove(obstacle);
        });
        
        this.obstacles = [];
        this.powerUpSpawns = [];
        this.pelletSpawns = [];
    }
} 
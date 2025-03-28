export class DebugSystem {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.panels = new Map();
        this.watches = new Map();
        this.commands = new Map();
        this.logs = [];
        this.maxLogs = 100;

        this.setupDebugUI();
        this.setupCommands();
        this.setupKeyBindings();
    }

    setupDebugUI() {
        this.container = document.createElement('div');
        this.container.className = 'debug-container hidden';
        this.container.innerHTML = `
            <div class="debug-header">
                <h2>Debug Panel</h2>
                <div class="debug-controls">
                    <button id="debugClear">Clear</button>
                    <button id="debugRefresh">Refresh</button>
                    <button id="debugClose">×</button>
                </div>
            </div>
            <div class="debug-content">
                <div class="debug-panels">
                    <div id="debugPerformance" class="debug-panel">
                        <h3>Performance</h3>
                        <div class="debug-panel-content"></div>
                    </div>
                    <div id="debugEntities" class="debug-panel">
                        <h3>Entities</h3>
                        <div class="debug-panel-content"></div>
                    </div>
                    <div id="debugState" class="debug-panel">
                        <h3>Game State</h3>
                        <div class="debug-panel-content"></div>
                    </div>
                </div>
                <div class="debug-console">
                    <div class="debug-log"></div>
                    <div class="debug-input-container">
                        <input type="text" class="debug-input" placeholder="Enter debug command...">
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.setupPanels();
        this.setupEventListeners();
    }

    setupPanels() {
        // Performance Panel
        this.addPanel('performance', {
            update: () => ({
                'FPS': this.game.fps.toFixed(1),
                'Draw Calls': this.game.renderer.info.render.calls,
                'Triangles': this.game.renderer.info.render.triangles,
                'Memory': `${(performance.memory?.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                'Entities': this.game.entities.size
            })
        });

        // Entities Panel
        this.addPanel('entities', {
            update: () => {
                const entities = {};
                this.game.entities.forEach(entity => {
                    const type = entity.type || 'unknown';
                    entities[type] = (entities[type] || 0) + 1;
                });
                return entities;
            }
        });

        // Game State Panel
        this.addPanel('state', {
            update: () => ({
                'Current Level': this.game.currentLevel,
                'Score': this.game.score,
                'Player Position': this.formatVector(this.game.player?.position),
                'Game State': this.game.state,
                'Active Power-ups': this.game.activePowerUps.length
            })
        });
    }

    setupCommands() {
        this.addCommand('help', () => {
            this.log('Available commands:', 'info');
            this.commands.forEach((cmd, name) => {
                this.log(`${name}: ${cmd.description}`, 'info');
            });
        }, 'Show available commands');

        this.addCommand('stats', () => {
            this.log('Game Statistics:', 'info');
            this.log(JSON.stringify(this.game.statistics, null, 2), 'data');
        }, 'Show game statistics');

        this.addCommand('spawn', (type, x, y, z) => {
            const position = new THREE.Vector3(
                parseFloat(x) || 0,
                parseFloat(y) || 0,
                parseFloat(z) || 0
            );
            this.game.spawnEntity(type, position);
            this.log(`Spawned ${type} at ${this.formatVector(position)}`, 'success');
        }, 'Spawn entity: spawn <type> <x> <y> <z>');

        this.addCommand('clear', () => {
            this.clearLogs();
        }, 'Clear debug console');

        this.addCommand('god', () => {
            this.game.player.invincible = !this.game.player.invincible;
            this.log(`God mode ${this.game.player.invincible ? 'enabled' : 'disabled'}`, 'success');
        }, 'Toggle god mode');
    }

    setupKeyBindings() {
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '`') {
                this.toggle();
            }
        });
    }

    setupEventListeners() {
        const input = this.container.querySelector('.debug-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(input.value);
                input.value = '';
            }
        });

        this.container.querySelector('#debugClose').addEventListener('click', () => {
            this.toggle();
        });

        this.container.querySelector('#debugClear').addEventListener('click', () => {
            this.clearLogs();
        });

        this.container.querySelector('#debugRefresh').addEventListener('click', () => {
            this.refreshPanels();
        });
    }

    addPanel(id, config) {
        this.panels.set(id, {
            element: document.querySelector(`#debug${id.charAt(0).toUpperCase() + id.slice(1)} .debug-panel-content`),
            update: config.update
        });
    }

    addWatch(name, getter) {
        this.watches.set(name, getter);
    }

    addCommand(name, callback, description) {
        this.commands.set(name, {
            callback,
            description
        });
    }

    executeCommand(input) {
        const args = input.trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (this.commands.has(command)) {
            try {
                this.commands.get(command).callback(...args);
            } catch (error) {
                this.log(`Error executing command: ${error.message}`, 'error');
            }
        } else {
            this.log(`Unknown command: ${command}`, 'error');
        }
    }

    log(message, type = 'info') {
        const log = {
            message,
            type,
            timestamp: new Date().toISOString()
        };

        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.updateLogDisplay();
    }

    clearLogs() {
        this.logs = [];
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const logElement = this.container.querySelector('.debug-log');
        logElement.innerHTML = this.logs.map(log => `
            <div class="debug-log-entry ${log.type}">
                <span class="debug-log-time">${log.timestamp.split('T')[1].split('.')[0]}</span>
                <span class="debug-log-message">${log.message}</span>
            </div>
        `).join('');
        logElement.scrollTop = logElement.scrollHeight;
    }

    update() {
        if (!this.enabled) return;

        // Update panels
        this.panels.forEach((panel, id) => {
            const data = panel.update();
            panel.element.innerHTML = Object.entries(data)
                .map(([key, value]) => `
                    <div class="debug-item">
                        <span class="debug-key">${key}:</span>
                        <span class="debug-value">${value}</span>
                    </div>
                `).join('');
        });

        // Update watches
        this.watches.forEach((getter, name) => {
            try {
                const value = getter();
                if (value !== undefined) {
                    this.updateWatch(name, value);
                }
            } catch (error) {
                console.error(`Error updating watch ${name}:`, error);
            }
        });
    }

    updateWatch(name, value) {
        const watchElement = this.container.querySelector(`#debugWatch_${name}`);
        if (watchElement) {
            watchElement.textContent = value;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        this.container.classList.toggle('hidden');
    }

    formatVector(vector) {
        if (!vector) return 'N/A';
        return `(${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`;
    }

    refreshPanels() {
        this.update();
    }
} 
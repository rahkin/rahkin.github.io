export class AdvancedUISystem {
    constructor(game) {
        this.game = game;
        this.elements = new Map();
        this.layouts = new Map();
        this.animations = new Map();
        this.eventListeners = new Map();
        this.styleSheet = null;

        this.setupStyleSheet();
        this.createBaseElements();
        this.setupEventHandling();
    }

    setupStyleSheet() {
        this.styleSheet = document.createElement('style');
        document.head.appendChild(this.styleSheet);

        // Add base styles
        this.addStyles(`
            .game-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                user-select: none;
                font-family: 'Arial', sans-serif;
            }

            .ui-element {
                position: absolute;
                transition: all 0.3s ease;
                pointer-events: auto;
            }

            .ui-container {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .ui-hidden {
                opacity: 0;
                visibility: hidden;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `);
    }

    createBaseElements() {
        // Create root UI container
        this.root = document.createElement('div');
        this.root.className = 'game-ui';
        document.body.appendChild(this.root);

        // Create basic layouts
        this.createLayout('hud', {
            position: 'top',
            elements: ['score', 'health', 'powerups']
        });

        this.createLayout('menu', {
            position: 'center',
            elements: ['title', 'buttons', 'settings']
        });

        this.createLayout('popup', {
            position: 'center',
            elements: ['message', 'buttons']
        });
    }

    createLayout(name, config) {
        const layout = {
            container: document.createElement('div'),
            config: config,
            elements: new Set()
        };

        layout.container.className = `ui-layout layout-${name}`;
        this.positionLayout(layout.container, config.position);
        this.root.appendChild(layout.container);

        this.layouts.set(name, layout);
    }

    positionLayout(element, position) {
        switch(position) {
            case 'top':
                element.style.top = '20px';
                element.style.left = '0';
                element.style.width = '100%';
                break;
            case 'bottom':
                element.style.bottom = '20px';
                element.style.left = '0';
                element.style.width = '100%';
                break;
            case 'center':
                element.style.top = '50%';
                element.style.left = '50%';
                element.style.transform = 'translate(-50%, -50%)';
                break;
            // Add more positions as needed
        }
    }

    createElement(id, config) {
        const element = document.createElement(config.tag || 'div');
        element.className = `ui-element ${config.className || ''}`;
        
        if (config.template) {
            element.innerHTML = config.template;
        }

        if (config.style) {
            Object.assign(element.style, config.style);
        }

        if (config.attributes) {
            Object.entries(config.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }

        if (config.events) {
            Object.entries(config.events).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
                this.eventListeners.set(`${id}-${event}`, handler);
            });
        }

        this.elements.set(id, {
            element,
            config,
            state: {
                visible: true,
                enabled: true
            }
        });

        if (config.layout) {
            this.addToLayout(id, config.layout);
        } else {
            this.root.appendChild(element);
        }

        if (config.animation) {
            this.addAnimation(id, config.animation);
        }

        return id;
    }

    addToLayout(elementId, layoutName) {
        const layout = this.layouts.get(layoutName);
        const elementData = this.elements.get(elementId);
        
        if (layout && elementData) {
            layout.container.appendChild(elementData.element);
            layout.elements.add(elementId);
        }
    }

    addAnimation(elementId, config) {
        const element = this.elements.get(elementId);
        if (!element) return;

        this.animations.set(elementId, {
            element: element.element,
            config: config,
            state: {
                playing: false,
                startTime: 0
            }
        });
    }

    playAnimation(elementId) {
        const animation = this.animations.get(elementId);
        if (!animation) return;

        animation.state.playing = true;
        animation.state.startTime = performance.now();
        
        animation.element.style.animation = `${animation.config.name} ${animation.config.duration}ms ${animation.config.easing || 'ease'}`;
        
        if (!animation.config.loop) {
            setTimeout(() => {
                this.stopAnimation(elementId);
            }, animation.config.duration);
        }
    }

    stopAnimation(elementId) {
        const animation = this.animations.get(elementId);
        if (!animation) return;

        animation.state.playing = false;
        animation.element.style.animation = '';
    }

    show(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.classList.remove('ui-hidden');
            elementData.state.visible = true;
        }
    }

    hide(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.classList.add('ui-hidden');
            elementData.state.visible = false;
        }
    }

    enable(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.disabled = false;
            elementData.state.enabled = true;
        }
    }

    disable(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.disabled = true;
            elementData.state.enabled = false;
        }
    }

    updateText(elementId, text) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.textContent = text;
        }
    }

    updateTemplate(elementId, template) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.innerHTML = template;
        }
    }

    addStyles(css) {
        this.styleSheet.sheet.insertRule(css, this.styleSheet.sheet.cssRules.length);
    }

    createPopup(config) {
        const popupId = `popup-${Date.now()}`;
        
        this.createElement(popupId, {
            layout: 'popup',
            className: 'ui-popup',
            template: `
                <div class="popup-content">
                    <h2>${config.title}</h2>
                    <p>${config.message}</p>
                    <div class="popup-buttons">
                        ${config.buttons.map(btn => `
                            <button class="popup-button" data-action="${btn.action}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `,
            animation: {
                name: 'fadeIn',
                duration: 300
            },
            events: {
                click: (e) => {
                    const button = e.target.closest('[data-action]');
                    if (button) {
                        const action = button.dataset.action;
                        if (config.callbacks && config.callbacks[action]) {
                            config.callbacks[action]();
                        }
                        this.closePopup(popupId);
                    }
                }
            }
        });

        this.playAnimation(popupId);
        return popupId;
    }

    closePopup(popupId) {
        const elementData = this.elements.get(popupId);
        if (elementData) {
            elementData.element.addEventListener('animationend', () => {
                this.removeElement(popupId);
            });
            elementData.element.style.animation = 'fadeOut 300ms ease';
        }
    }

    removeElement(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.remove();
            this.elements.delete(elementId);
            this.animations.delete(elementId);
            
            // Remove event listeners
            Object.keys(elementData.config.events || {}).forEach(event => {
                const listenerId = `${elementId}-${event}`;
                this.eventListeners.delete(listenerId);
            });
        }
    }

    update() {
        // Update animations
        this.animations.forEach((animation, elementId) => {
            if (animation.state.playing && animation.config.update) {
                const elapsed = performance.now() - animation.state.startTime;
                animation.config.update(animation.element, elapsed);
            }
        });
    }

    clear() {
        this.elements.forEach((_, elementId) => {
            this.removeElement(elementId);
        });
        this.layouts.clear();
        this.animations.clear();
        this.eventListeners.clear();
    }
} 
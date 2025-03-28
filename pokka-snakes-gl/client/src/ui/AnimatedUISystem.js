export class AnimatedUISystem {
    constructor(game) {
        this.game = game;
        this.elements = new Map();
        this.animations = new Map();
        this.timeline = gsap.timeline();
        
        this.setupStyles();
        this.createUIElements();
        this.setupEventListeners();
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .game-ui {
                position: fixed;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
            }

            .ui-element {
                position: absolute;
                transition: transform 0.3s ease-out;
            }

            .score-popup {
                color: #fff;
                font-size: 24px;
                text-shadow: 0 0 10px rgba(255,255,255,0.8);
                opacity: 0;
                transform: translateY(0);
            }

            .combo-text {
                color: #ff0;
                font-size: 32px;
                text-shadow: 0 0 15px rgba(255,255,0,0.8);
                opacity: 0;
                transform: scale(0);
            }

            .power-up-indicator {
                background: rgba(0,0,0,0.7);
                border-radius: 10px;
                padding: 10px;
                color: #fff;
                display: flex;
                align-items: center;
                opacity: 0;
                transform: translateX(-100%);
            }

            .menu-item {
                transform: translateX(-100%);
                opacity: 0;
                transition: all 0.3s ease-out;
            }

            .notification {
                background: rgba(0,0,0,0.8);
                color: #fff;
                padding: 15px;
                border-radius: 8px;
                transform: translateY(100%);
                opacity: 0;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            @keyframes glow {
                0% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); }
                50% { filter: drop-shadow(0 0 15px rgba(255,255,255,0.8)); }
                100% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); }
            }
        `;
        document.head.appendChild(style);
    }

    createUIElements() {
        // Create main UI container
        this.container = document.createElement('div');
        this.container.className = 'game-ui';
        document.body.appendChild(this.container);

        // Create HUD elements
        this.createHUD();
        this.createMenuSystem();
        this.createNotificationSystem();
    }

    createHUD() {
        const hud = {
            score: this.createUIElement('div', 'score-display', 'top: 20px; right: 20px;'),
            health: this.createUIElement('div', 'health-bar', 'bottom: 20px; left: 20px;'),
            combo: this.createUIElement('div', 'combo-counter', 'top: 50%; left: 50%;'),
            powerUps: this.createUIElement('div', 'power-up-container', 'top: 20px; left: 20px;')
        };

        this.elements.set('hud', hud);
    }

    createMenuSystem() {
        const menu = {
            container: this.createUIElement('div', 'menu-container', 
                'top: 50%; left: 50%; transform: translate(-50%, -50%);'),
            items: []
        };

        // Add menu items
        ['Play', 'Options', 'Credits'].forEach((text, index) => {
            const item = this.createUIElement('div', 'menu-item', '');
            item.textContent = text;
            menu.items.push(item);
            menu.container.appendChild(item);
        });

        this.elements.set('menu', menu);
    }

    createNotificationSystem() {
        const notifications = this.createUIElement('div', 'notification-container', 
            'top: 20px; right: 20px;');
        this.elements.set('notifications', notifications);
    }

    createUIElement(type, className, style) {
        const element = document.createElement(type);
        element.className = `ui-element ${className}`;
        element.style.cssText = style;
        this.container.appendChild(element);
        return element;
    }

    showScorePopup(score, position, isCombo = false) {
        const popup = this.createUIElement('div', 'score-popup', '');
        popup.textContent = `+${score}`;

        // Convert 3D position to screen coordinates
        const screenPosition = this.worldToScreen(position);
        popup.style.left = `${screenPosition.x}px`;
        popup.style.top = `${screenPosition.y}px`;

        // Animate popup
        gsap.timeline()
            .to(popup, {
                opacity: 1,
                y: -50,
                duration: 0.3,
                ease: "power2.out"
            })
            .to(popup, {
                opacity: 0,
                y: -100,
                duration: 0.5,
                ease: "power2.in",
                onComplete: () => popup.remove()
            });

        if (isCombo) {
            popup.style.color = '#ff0';
            popup.style.scale = 1.5;
        }
    }

    showCombo(count) {
        const combo = this.elements.get('hud').combo;
        combo.textContent = `${count}x COMBO!`;

        gsap.timeline()
            .to(combo, {
                scale: 1.5,
                opacity: 1,
                duration: 0.2,
                ease: "back.out"
            })
            .to(combo, {
                scale: 1,
                duration: 0.3,
                ease: "elastic.out"
            })
            .to(combo, {
                opacity: 0,
                duration: 0.5,
                delay: 0.5
            });
    }

    showPowerUp(type, duration) {
        const container = this.elements.get('hud').powerUps;
        const indicator = this.createUIElement('div', 'power-up-indicator', '');
        
        indicator.innerHTML = `
            <img src="assets/icons/${type}.png" alt="${type}">
            <div class="power-up-timer"></div>
        `;

        gsap.timeline()
            .to(indicator, {
                x: 0,
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
            })
            .to(indicator.querySelector('.power-up-timer'), {
                width: 0,
                duration: duration,
                ease: "none"
            })
            .to(indicator, {
                x: -100,
                opacity: 0,
                duration: 0.3,
                onComplete: () => indicator.remove()
            });
    }

    updateScore(score, multiplier = 1) {
        const scoreDisplay = this.elements.get('hud').score;
        const currentScore = parseInt(scoreDisplay.textContent) || 0;
        
        gsap.to(scoreDisplay, {
            textContent: score,
            duration: 0.5,
            snap: { textContent: 1 },
            ease: "power2.out"
        });

        if (multiplier > 1) {
            scoreDisplay.setAttribute('data-multiplier', `x${multiplier}`);
            gsap.to(scoreDisplay, {
                scale: 1.2,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        }
    }

    updateHealth(percentage) {
        const healthBar = this.elements.get('hud').health;
        
        gsap.to(healthBar.querySelector('.fill'), {
            width: `${percentage}%`,
            duration: 0.3,
            ease: "power2.out"
        });

        if (percentage < 30) {
            healthBar.classList.add('critical');
            this.pulseElement(healthBar);
        } else {
            healthBar.classList.remove('critical');
            this.stopPulse(healthBar);
        }
    }

    showMenu() {
        const menu = this.elements.get('menu');
        menu.container.style.display = 'flex';

        gsap.timeline()
            .to(menu.container, {
                opacity: 1,
                duration: 0.3
            })
            .to(menu.items, {
                x: 0,
                opacity: 1,
                duration: 0.3,
                stagger: 0.1
            });
    }

    hideMenu() {
        const menu = this.elements.get('menu');

        gsap.timeline()
            .to(menu.items, {
                x: -100,
                opacity: 0,
                duration: 0.3,
                stagger: 0.1
            })
            .to(menu.container, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    menu.container.style.display = 'none';
                }
            });
    }

    showNotification(message, type = 'info') {
        const notification = this.createUIElement('div', 'notification', '');
        notification.textContent = message;
        notification.classList.add(`notification-${type}`);

        gsap.timeline()
            .to(notification, {
                y: 0,
                opacity: 1,
                duration: 0.3,
                ease: "back.out"
            })
            .to(notification, {
                y: -20,
                opacity: 0,
                duration: 0.3,
                delay: 2,
                ease: "power2.in",
                onComplete: () => notification.remove()
            });
    }

    pulseElement(element) {
        gsap.to(element, {
            scale: 1.1,
            duration: 0.5,
            repeat: -1,
            yoyo: true
        });
    }

    stopPulse(element) {
        gsap.killTweensOf(element);
        gsap.to(element, {
            scale: 1,
            duration: 0.2
        });
    }

    shakeElement(element) {
        gsap.to(element, {
            x: "random(-10, 10)",
            y: "random(-10, 10)",
            duration: 0.1,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                gsap.set(element, { x: 0, y: 0 });
            }
        });
    }

    worldToScreen(position) {
        const vector = position.clone();
        vector.project(this.game.camera);

        return {
            x: (vector.x + 1) * window.innerWidth / 2,
            y: (-vector.y + 1) * window.innerHeight / 2
        };
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
        this.game.events.on('score:update', this.updateScore.bind(this));
        this.game.events.on('health:update', this.updateHealth.bind(this));
        this.game.events.on('combo:update', this.showCombo.bind(this));
        this.game.events.on('powerup:acquired', this.showPowerUp.bind(this));
    }

    onResize() {
        // Update positions of UI elements that depend on screen coordinates
        this.elements.forEach(element => {
            if (element.updatePosition) {
                element.updatePosition();
            }
        });
    }

    playTransition(type) {
        switch (type) {
            case 'fadeIn':
                return gsap.to(this.container, {
                    opacity: 1,
                    duration: 0.5
                });
            case 'fadeOut':
                return gsap.to(this.container, {
                    opacity: 0,
                    duration: 0.5
                });
            case 'slideIn':
                return gsap.from(this.container, {
                    x: '-100%',
                    duration: 0.5,
                    ease: "power2.out"
                });
            case 'slideOut':
                return gsap.to(this.container, {
                    x: '100%',
                    duration: 0.5,
                    ease: "power2.in"
                });
        }
    }

    cleanup() {
        // Remove all UI elements
        this.container.remove();
        
        // Kill all active animations
        gsap.killTweensOf(this.elements);
        
        // Clear maps
        this.elements.clear();
        this.animations.clear();
        
        // Remove event listeners
        window.removeEventListener('resize', this.onResize.bind(this));
    }
} 
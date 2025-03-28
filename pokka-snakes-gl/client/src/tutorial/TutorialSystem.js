export class TutorialSystem {
    constructor(game) {
        this.game = game;
        this.currentStep = null;
        this.steps = new Map();
        this.completed = new Set();
        this.active = false;
        
        this.setupTutorialSteps();
        this.createTutorialUI();
    }

    setupTutorialSteps() {
        this.addTutorialStep('movement', {
            title: 'Basic Movement',
            message: 'Use WASD or Arrow Keys to move the snake',
            condition: () => this.game.player.distanceTraveled > 10,
            highlight: ['moveControls'],
            required: true
        });

        this.addTutorialStep('pellets', {
            title: 'Collecting Pellets',
            message: 'Collect the glowing pellets to grow longer',
            condition: () => this.game.player.pelletsCollected > 0,
            highlight: ['nearestPellet'],
            required: true
        });

        this.addTutorialStep('boost', {
            title: 'Boost Ability',
            message: 'Press SHIFT to boost. Watch your energy meter!',
            condition: () => this.game.player.hasUsedBoost,
            highlight: ['energyMeter'],
            required: true
        });

        this.addTutorialStep('powerUps', {
            title: 'Power-Ups',
            message: 'Collect special power-ups for temporary abilities',
            condition: () => this.game.player.powerUpsCollected > 0,
            highlight: ['powerUpIndicator'],
            required: false
        });

        this.addTutorialStep('combo', {
            title: 'Combo System',
            message: 'Collect pellets quickly to build up your combo multiplier',
            condition: () => this.game.player.highestCombo >= 3,
            highlight: ['comboMeter'],
            required: false
        });
    }

    addTutorialStep(id, config) {
        this.steps.set(id, {
            id,
            ...config,
            completed: false,
            shown: false
        });
    }

    createTutorialUI() {
        const container = document.createElement('div');
        container.className = 'tutorial-container';
        container.innerHTML = `
            <div class="tutorial-popup hidden">
                <h3 class="tutorial-title"></h3>
                <p class="tutorial-message"></p>
                <div class="tutorial-controls">
                    <button class="tutorial-next">Got it!</button>
                    <button class="tutorial-skip">Skip Tutorial</button>
                </div>
            </div>
            <div class="tutorial-highlight"></div>
        `;

        document.body.appendChild(container);
        this.ui = {
            container,
            popup: container.querySelector('.tutorial-popup'),
            title: container.querySelector('.tutorial-title'),
            message: container.querySelector('.tutorial-message'),
            nextButton: container.querySelector('.tutorial-next'),
            skipButton: container.querySelector('.tutorial-skip'),
            highlight: container.querySelector('.tutorial-highlight')
        };

        this.setupUIEvents();
    }

    setupUIEvents() {
        this.ui.nextButton.addEventListener('click', () => {
            this.hideCurrentStep();
            this.findAndShowNextStep();
        });

        this.ui.skipButton.addEventListener('click', () => {
            this.endTutorial();
        });
    }

    start() {
        if (this.hasCompletedTutorial()) return;
        
        this.active = true;
        this.completed.clear();
        this.steps.forEach(step => {
            step.completed = false;
            step.shown = false;
        });

        this.findAndShowNextStep();
    }

    update() {
        if (!this.active) return;

        this.steps.forEach(step => {
            if (!step.completed && !step.shown && step.condition()) {
                this.completeStep(step.id);
            }
        });
    }

    completeStep(stepId) {
        const step = this.steps.get(stepId);
        if (!step || step.completed) return;

        step.completed = true;
        this.completed.add(stepId);
        this.game.eventSystem.emit('tutorialStepCompleted', { stepId });

        if (this.currentStep && this.currentStep.id === stepId) {
            this.hideCurrentStep();
            this.findAndShowNextStep();
        }
    }

    showStep(stepId) {
        const step = this.steps.get(stepId);
        if (!step || step.shown) return;

        this.currentStep = step;
        step.shown = true;

        // Update UI
        this.ui.title.textContent = step.title;
        this.ui.message.textContent = step.message;
        this.ui.popup.classList.remove('hidden');

        // Handle highlights
        this.updateHighlight(step.highlight);

        // Pause game if it's a required step
        if (step.required) {
            this.game.pause();
        }

        this.game.eventSystem.emit('tutorialStepShown', { stepId });
    }

    hideCurrentStep() {
        if (!this.currentStep) return;

        this.ui.popup.classList.add('hidden');
        this.clearHighlight();
        
        if (this.currentStep.required) {
            this.game.resume();
        }

        this.currentStep = null;
    }

    updateHighlight(elements) {
        this.clearHighlight();
        if (!elements) return;

        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                const rect = element.getBoundingClientRect();
                this.ui.highlight.style.left = `${rect.left}px`;
                this.ui.highlight.style.top = `${rect.top}px`;
                this.ui.highlight.style.width = `${rect.width}px`;
                this.ui.highlight.style.height = `${rect.height}px`;
                this.ui.highlight.classList.remove('hidden');
            }
        });
    }

    clearHighlight() {
        this.ui.highlight.classList.add('hidden');
    }

    findAndShowNextStep() {
        const nextStep = Array.from(this.steps.values()).find(step => 
            !step.completed && !step.shown && (!this.currentStep || step.required)
        );

        if (nextStep) {
            this.showStep(nextStep.id);
        } else {
            this.endTutorial();
        }
    }

    endTutorial() {
        this.active = false;
        this.hideCurrentStep();
        this.game.resume();
        this.game.eventSystem.emit('tutorialCompleted');
        localStorage.setItem('tutorialCompleted', 'true');
    }

    hasCompletedTutorial() {
        return localStorage.getItem('tutorialCompleted') === 'true';
    }

    reset() {
        this.completed.clear();
        this.steps.forEach(step => {
            step.completed = false;
            step.shown = false;
        });
        this.hideCurrentStep();
        this.active = false;
    }
} 
export class TouchControls {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30;
        
        this.createTouchInterface();
        this.setupEventListeners();
    }

    createTouchInterface() {
        this.touchInterface = document.createElement('div');
        this.touchInterface.className = 'touch-controls';
        this.touchInterface.innerHTML = `
            <div class="touch-area">
                <div class="touch-button up">↑</div>
                <div class="touch-button right">→</div>
                <div class="touch-button down">↓</div>
                <div class="touch-button left">←</div>
            </div>
        `;
        document.body.appendChild(this.touchInterface);
    }

    setupEventListeners() {
        // Touch controls
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;

            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;

            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;

            if (Math.abs(deltaX) > this.swipeThreshold || 
                Math.abs(deltaY) > this.swipeThreshold) {
                
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    if (deltaX > 0) {
                        this.callbacks.onRight();
                    } else {
                        this.callbacks.onLeft();
                    }
                } else {
                    // Vertical swipe
                    if (deltaY > 0) {
                        this.callbacks.onDown();
                    } else {
                        this.callbacks.onUp();
                    }
                }

                this.touchStartX = touchEndX;
                this.touchStartY = touchEndY;
            }
        });

        document.addEventListener('touchend', () => {
            this.touchStartX = null;
            this.touchStartY = null;
        });

        // Virtual buttons
        const buttons = this.touchInterface.querySelectorAll('.touch-button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const direction = button.className.split(' ')[1];
                this.callbacks[`on${direction.charAt(0).toUpperCase() + direction.slice(1)}`]();
            });
        });
    }

    show() {
        this.touchInterface.style.display = 'flex';
    }

    hide() {
        this.touchInterface.style.display = 'none';
    }
} 
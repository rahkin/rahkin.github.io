import { Game } from './Game';
import './styles/hud.css';

// Import Three.js dynamically
const loadThree = async () => {
    const THREE = await import('three');
    return THREE;
};

try {
    // Wait for the DOM to be fully loaded
    window.addEventListener('load', async () => {
        const THREE = await loadThree();
        const game = new Game();
        game.start();

        // Handle window resize
        window.addEventListener('resize', () => {
            game.onResize();
        });

        // Handle cleanup when the window is closed
        window.addEventListener('beforeunload', () => {
            game.cleanup();
        });
    });
} catch (error) {
    console.error('Error initializing game:', error);
}

import { Game } from './Game';
import './styles/hud.css';

try {
    // Wait for the DOM to be fully loaded
    window.addEventListener('load', () => {
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

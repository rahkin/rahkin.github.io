// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Create game instance
    const game = new Game(canvas);

    // Handle start button click
    document.getElementById('startButton').addEventListener('click', () => {
        // Get player name
        const nameInput = document.getElementById('playerName');
        const playerName = nameInput.value.trim() || 'Anonymous';

        // Hide start screen
        document.getElementById('startScreen').style.display = 'none';

        // Show game UI
        document.getElementById('gameUI').style.display = 'flex';

        // Start game
        game.start(playerName);
    });

    // Handle play again button click
    document.getElementById('playAgainButton').addEventListener('click', () => {
        // Hide game over screen
        document.getElementById('gameOverScreen').style.display = 'none';

        // Show start screen
        document.getElementById('startScreen').style.display = 'flex';
    });

    // Handle name input max length
    const nameInput = document.getElementById('playerName');
    nameInput.addEventListener('input', () => {
        if (nameInput.value.length > CONFIG.MAX_NAME_LENGTH) {
            nameInput.value = nameInput.value.substring(0, CONFIG.MAX_NAME_LENGTH);
        }
    });

    // Initialize high scores display
    game.updateHighScoresDisplay();

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // Handle fullscreen toggle
    document.getElementById('fullscreenButton').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Handle window focus/blur
    window.addEventListener('blur', () => {
        if (game.player) {
            game.player.setBoost(false);
        }
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.player) {
            game.player.setBoost(false);
        }
    });
}); 
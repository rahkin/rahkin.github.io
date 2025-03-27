class SoundManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;

        // Define sound effects
        this.loadSound('move', 'assets/sounds/move.mp3');
        this.loadSound('rotate', 'assets/sounds/rotate.mp3');
        this.loadSound('land', 'assets/sounds/land.mp3');
        this.loadSound('clear', 'assets/sounds/clear.mp3');
        this.loadSound('levelup', 'assets/sounds/levelup.mp3');
        this.loadSound('gameover', 'assets/sounds/gameover.mp3');
    }

    loadSound(name, path) {
        this.sounds[name] = new Audio(path);
        this.sounds[name].load();
    }

    play(soundName) {
        if (this.isMuted || !this.sounds[soundName]) return;
        
        // Stop and reset the sound before playing
        this.sounds[soundName].currentTime = 0;
        
        // Play the sound
        this.sounds[soundName].play().catch(error => {
            console.log(`Error playing sound ${soundName}:`, error);
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    setMute(mute) {
        this.isMuted = mute;
    }
}

// Create and export a single instance
const soundManager = new SoundManager();
export default soundManager; 
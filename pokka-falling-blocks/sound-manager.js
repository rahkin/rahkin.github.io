class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.loadSounds();
    }

    loadSounds() {
        const soundFiles = {
            move: 'assets/sounds/move.mp3',
            rotate: 'assets/sounds/rotate.mp3',
            land: 'assets/sounds/land.mp3',
            clear: 'assets/sounds/clear.mp3',
            levelup: 'assets/sounds/levelup.mp3',
            gameover: 'assets/sounds/gameover.mp3'
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds[name] = audio;
        }
    }

    play(soundName) {
        if (this.muted || !this.sounds[soundName]) return;
        
        // Clone the audio to allow multiple simultaneous plays
        const sound = this.sounds[soundName].cloneNode();
        sound.volume = 0.5; // Set volume to 50%
        sound.play().catch(error => console.log('Error playing sound:', error));
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    setMute(muted) {
        this.muted = muted;
    }
}

// Create a global instance
window.soundManager = new SoundManager(); 
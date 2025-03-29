export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.weatherSounds = new Map();
        this.currentWeather = 'sunny';
        this.isMuted = false;
        this.volume = 0.5;
        this.hasUserInteracted = false;
        this.soundBuffers = new Map();
        this.loadedSounds = new Set();
        
        console.log('AudioManager: Initializing');
        
        try {
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioManager: Audio context created, state:', this.audioContext.state);
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volume;
        } catch (error) {
            console.error('AudioManager: Failed to create audio context:', error);
        }
        
        // Create audio status indicator
        this.createAudioStatusIndicator();
        
        // Initialize sounds
        this.initializeSounds();

        // Add click event listener to enable audio
        const enableAudioHandler = () => {
            console.log('AudioManager: Click/touch detected');
            this.enableAudio();
        };

        // Add event listeners to multiple elements to ensure we catch the interaction
        const elements = [
            document.body,
            window,
            document.documentElement,
            document.getElementById('game-container') || document.body
        ];

        elements.forEach(element => {
            if (element) {
                element.addEventListener('click', enableAudioHandler, { once: true });
                element.addEventListener('touchstart', enableAudioHandler, { once: true });
                element.addEventListener('keydown', enableAudioHandler, { once: true });
            }
        });
        
        console.log('AudioManager: Event listeners added');
    }

    createAudioStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'audio-status';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: 'Press Start 2P', monospace;
            font-size: 12px;
            z-index: 1000;
            cursor: pointer;
            transition: opacity 0.3s;
        `;
        indicator.textContent = '🔇 Click to enable audio';
        indicator.onclick = () => this.enableAudio();
        document.body.appendChild(indicator);
        this.audioStatusIndicator = indicator;
    }

    async initializeSounds() {
        console.log('AudioManager: Initializing sounds');
        
        // Game sounds
        const gameSounds = {
            eat: 'sounds/eat.wav',
            gameOver: 'sounds/gameOver.wav',
            powerUp: 'sounds/powerUp.wav',
            turn: 'sounds/turn.wav',
            background: 'sounds/background.wav',
            click: 'sounds/click.wav'
        };

        // Weather sounds
        const weatherSounds = {
            rain: 'sounds/rain.wav',
            snow: 'sounds/snow.wav',
            wind: 'sounds/wind.wav'
        };

        // Load all game sounds
        for (const [name, path] of Object.entries(gameSounds)) {
            try {
                console.log('AudioManager: Loading sound:', name);
                const buffer = await this.loadSoundFile(path);
                this.soundBuffers.set(name, buffer);
                this.loadedSounds.add(name);
                console.log('AudioManager: Successfully loaded sound:', name);
            } catch (error) {
                console.error('AudioManager: Failed to load sound:', name, error);
            }
        }

        // Load all weather sounds
        for (const [name, path] of Object.entries(weatherSounds)) {
            try {
                console.log('AudioManager: Loading weather sound:', name);
                const buffer = await this.loadSoundFile(path);
                this.soundBuffers.set(name, buffer);
                this.loadedSounds.add(name);
                console.log('AudioManager: Successfully loaded weather sound:', name);
            } catch (error) {
                console.error('AudioManager: Failed to load weather sound:', name, error);
            }
        }

        console.log('AudioManager: All sounds initialized. Loaded sounds:', Array.from(this.loadedSounds));
    }

    async loadSoundFile(url) {
        console.log('AudioManager: Loading sound file:', url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error('AudioManager: Error loading sound file:', url, error);
            throw error;
        }
    }

    play(soundName, loop = false) {
        if (this.isMuted) {
            console.log('AudioManager: Sound not played - muted:', soundName);
            return;
        }

        if (!this.loadedSounds.has(soundName)) {
            console.warn('AudioManager: Sound not loaded yet:', soundName);
            return;
        }

        const buffer = this.soundBuffers.get(soundName);
        if (!buffer) {
            console.warn('AudioManager: Sound buffer not found:', soundName);
            return;
        }

        try {
            // Create source node
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;

            // Create gain node for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume;

            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Start playing
            source.start(0);
            console.log('AudioManager: Started playing sound:', soundName);

            // Store reference if looping
            if (loop) {
                this.sounds.set(soundName, { source, gainNode });
            }

            // Clean up when done
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
                if (loop) {
                    this.sounds.delete(soundName);
                }
                console.log('AudioManager: Sound ended:', soundName);
            };
        } catch (error) {
            console.error('AudioManager: Failed to play sound:', soundName, error);
        }
    }

    stop(soundName) {
        const sound = this.sounds.get(soundName);
        if (sound) {
            try {
                sound.source.stop();
                sound.source.disconnect();
                sound.gainNode.disconnect();
                this.sounds.delete(soundName);
            } catch (error) {
                console.error('AudioManager: Error stopping sound:', soundName, error);
            }
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.value = this.volume;
    }

    enableAudio() {
        console.log('AudioManager: enableAudio called, hasUserInteracted:', this.hasUserInteracted);
        if (!this.hasUserInteracted) {
            this.hasUserInteracted = true;
            
            // Update visual indicator
            if (this.audioStatusIndicator) {
                this.audioStatusIndicator.textContent = '🔊 Audio enabled';
                setTimeout(() => {
                    this.audioStatusIndicator.style.opacity = '0';
                    setTimeout(() => {
                        this.audioStatusIndicator.remove();
                    }, 300);
                }, 2000);
            }
            
            if (this.audioContext) {
                console.log('AudioManager: Current audio context state:', this.audioContext.state);
                if (this.audioContext.state === 'suspended') {
                    console.log('AudioManager: Resuming audio context');
                    this.audioContext.resume().then(() => {
                        console.log('AudioManager: Audio context resumed successfully, new state:', this.audioContext.state);
                        // Start background music after context is resumed
                        this.play('background', true);
                    }).catch(error => {
                        console.error('AudioManager: Failed to resume audio context:', error);
                    });
                } else {
                    console.log('AudioManager: Audio context already running, starting background music');
                    this.play('background', true);
                }
            } else {
                console.error('AudioManager: No audio context available');
            }
        }
    }

    cleanup() {
        // Stop all sounds
        for (const [name, sound] of this.sounds) {
            this.stop(name);
        }
        this.sounds.clear();

        // Remove audio status indicator
        if (this.audioStatusIndicator) {
            this.audioStatusIndicator.remove();
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
} 
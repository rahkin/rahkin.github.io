export class SoundSystem {
    constructor() {
        this.sounds = new Map();
        this.music = null;
        this.currentMusic = null;
        this.isMuted = false;
        this.soundVolume = 0.5;
        this.musicVolume = 0.3;
        
        this.initAudio();
    }

    async initAudio() {
        // Create Audio Context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create main volume nodes
        this.musicGain = this.audioContext.createGain();
        this.soundGain = this.audioContext.createGain();
        this.musicGain.connect(this.audioContext.destination);
        this.soundGain.connect(this.audioContext.destination);

        // Load sound effects
        await Promise.all([
            this.loadSound('collect', '/assets/sounds/collect.mp3'),
            this.loadSound('powerup', '/assets/sounds/powerup.mp3'),
            this.loadSound('death', '/assets/sounds/death.mp3'),
            this.loadSound('menu', '/assets/sounds/menu.mp3'),
            this.loadSound('combo', '/assets/sounds/combo.mp3'),
            this.loadSound('wall', '/assets/sounds/wall.mp3')
        ]);

        // Load background music
        await this.loadMusic('game', '/assets/music/game.mp3');
        await this.loadMusic('menu', '/assets/music/menu.mp3');
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds.set(name, audioBuffer);
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
        }
    }

    async loadMusic(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.music = audioBuffer;
        } catch (error) {
            console.error(`Error loading music ${name}:`, error);
        }
    }

    playSound(name, options = {}) {
        if (this.isMuted || !this.sounds.has(name)) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds.get(name);
        
        // Create gain node for this specific sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = (options.volume || 1) * this.soundVolume;
        
        // Add effects if specified
        if (options.pitch) {
            source.playbackRate.value = options.pitch;
        }

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.soundGain);
        
        // Play sound
        source.start(0);
        
        return source;
    }

    playMusic(name, fadeTime = 1) {
        if (this.isMuted) return;

        // Stop current music with fade out
        if (this.currentMusic) {
            this.currentMusic.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeTime);
            setTimeout(() => {
                this.currentMusic.disconnect();
            }, fadeTime * 1000);
        }

        // Create and start new music
        const source = this.audioContext.createBufferSource();
        source.buffer = this.music;
        source.loop = true;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        gainNode.gain.linearRampToValueAtTime(this.musicVolume, this.audioContext.currentTime + fadeTime);

        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        source.start(0);

        this.currentMusic = gainNode;
    }

    setVolume(volume) {
        this.soundVolume = volume;
        this.soundGain.gain.value = volume;
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.currentMusic) {
            this.currentMusic.gain.value = volume;
        }
    }

    mute() {
        this.isMuted = true;
        this.soundGain.gain.value = 0;
        this.musicGain.gain.value = 0;
    }

    unmute() {
        this.isMuted = false;
        this.soundGain.gain.value = this.soundVolume;
        this.musicGain.gain.value = this.musicVolume;
    }
} 
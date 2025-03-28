export class AdvancedAudioSystem {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = new Map();
        this.music = new Map();
        this.listeners = new Map();
        
        this.masterGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        
        // Connect gain nodes
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        
        // Setup audio processing
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        
        this.setupAnalyser();
        this.setupEffects();
    }

    setupAnalyser() {
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.frequencyData = new Uint8Array(this.bufferLength);
    }

    setupEffects() {
        this.effects = {
            reverb: this.createReverb(),
            delay: this.createDelay(),
            filter: this.createFilter()
        };
    }

    async loadSound(name, url, options = {}) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

            this.sounds.set(name, {
                buffer: audioBuffer,
                options: {
                    loop: options.loop || false,
                    volume: options.volume || 1,
                    spatial: options.spatial || false,
                    effects: options.effects || []
                }
            });

            return true;
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
            return false;
        }
    }

    async loadMusic(name, url, options = {}) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

            this.music.set(name, {
                buffer: audioBuffer,
                options: {
                    loop: options.loop || true,
                    volume: options.volume || 1,
                    fadeIn: options.fadeIn || 2,
                    fadeOut: options.fadeOut || 2
                }
            });

            return true;
        } catch (error) {
            console.error(`Error loading music ${name}:`, error);
            return false;
        }
    }

    playSound(name, position = null) {
        const sound = this.sounds.get(name);
        if (!sound) return null;

        const source = this.context.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = sound.options.loop;

        const gainNode = this.context.createGain();
        gainNode.gain.value = sound.options.volume;

        let outputNode = gainNode;

        // Apply effects if specified
        sound.options.effects.forEach(effectName => {
            const effect = this.effects[effectName];
            if (effect) {
                outputNode.connect(effect.input);
                outputNode = effect.output;
            }
        });

        // Setup spatial audio if position is provided
        if (position && sound.options.spatial) {
            const panner = this.context.createPanner();
            panner.setPosition(position.x, position.y, position.z);
            outputNode.connect(panner);
            outputNode = panner;
        }

        outputNode.connect(this.sfxGain);
        source.connect(gainNode);
        source.start(0);

        return {
            source,
            gainNode,
            stop: () => source.stop(),
            setVolume: (volume) => {
                gainNode.gain.setValueAtTime(volume, this.context.currentTime);
            }
        };
    }

    playMusic(name, fadeIn = true) {
        const music = this.music.get(name);
        if (!music) return null;

        const source = this.context.createBufferSource();
        source.buffer = music.buffer;
        source.loop = music.options.loop;

        const gainNode = this.context.createGain();
        
        if (fadeIn) {
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                music.options.volume,
                this.context.currentTime + music.options.fadeIn
            );
        } else {
            gainNode.gain.value = music.options.volume;
        }

        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        source.start(0);

        return {
            source,
            gainNode,
            stop: (fadeOut = true) => {
                if (fadeOut) {
                    gainNode.gain.linearRampToValueAtTime(
                        0,
                        this.context.currentTime + music.options.fadeOut
                    );
                    setTimeout(() => source.stop(), music.options.fadeOut * 1000);
                } else {
                    source.stop();
                }
            },
            setVolume: (volume) => {
                gainNode.gain.setValueAtTime(volume, this.context.currentTime);
            }
        };
    }

    createReverb() {
        const convolver = this.context.createConvolver();
        
        // Create impulse response
        const length = 2;
        const decay = 2;
        const rate = this.context.sampleRate;
        const impulse = this.context.createBuffer(2, length * rate, rate);
        
        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / (length * rate), decay);
            }
        }
        
        convolver.buffer = impulse;
        
        return {
            input: convolver,
            output: convolver
        };
    }

    createDelay() {
        const delay = this.context.createDelay(1.0);
        const feedback = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        delay.delayTime.value = 0.3;
        feedback.gain.value = 0.4;
        filter.frequency.value = 1000;
        
        delay.connect(feedback);
        feedback.connect(filter);
        filter.connect(delay);
        
        return {
            input: delay,
            output: delay
        };
    }

    createFilter() {
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        return {
            input: filter,
            output: filter
        };
    }

    setListenerPosition(position, orientation) {
        const listener = this.context.listener;
        
        if (position) {
            listener.setPosition(position.x, position.y, position.z);
        }
        
        if (orientation) {
            listener.setOrientation(
                orientation.forward.x, orientation.forward.y, orientation.forward.z,
                orientation.up.x, orientation.up.y, orientation.up.z
            );
        }
    }

    setMasterVolume(volume) {
        this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    setMusicVolume(volume) {
        this.musicGain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    setSFXVolume(volume) {
        this.sfxGain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    getAudioData() {
        this.analyser.getByteTimeDomainData(this.dataArray);
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        return {
            waveform: Array.from(this.dataArray),
            frequency: Array.from(this.frequencyData)
        };
    }

    async preloadSounds(sounds) {
        const loadPromises = sounds.map(sound => 
            this.loadSound(sound.name, sound.url, sound.options)
        );
        return Promise.all(loadPromises);
    }

    async preloadMusic(tracks) {
        const loadPromises = tracks.map(track => 
            this.loadMusic(track.name, track.url, track.options)
        );
        return Promise.all(loadPromises);
    }

    resume() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    suspend() {
        if (this.context.state === 'running') {
            this.context.suspend();
        }
    }

    dispose() {
        this.context.close();
    }
} 
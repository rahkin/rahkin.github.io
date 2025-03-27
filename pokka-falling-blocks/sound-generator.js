class SoundGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async generateSounds() {
        const sounds = {
            move: this.generateMoveSound(),
            rotate: this.generateRotateSound(),
            land: this.generateLandSound(),
            clear: this.generateClearSound(),
            levelup: this.generateLevelUpSound(),
            gameover: this.generateGameOverSound()
        };

        // Convert each sound to MP3 blob and download
        for (const [name, buffer] of Object.entries(sounds)) {
            const blob = await this.audioBufferToBlob(buffer);
            this.downloadBlob(blob, `${name}.mp3`);
        }
    }

    generateMoveSound() {
        // Short blip sound
        const duration = 0.1;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-8 * t);
        }
        
        return buffer;
    }

    generateRotateSound() {
        // Ascending blip
        const duration = 0.15;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const freq = 440 + 220 * t;
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-5 * t);
        }
        
        return buffer;
    }

    generateLandSound() {
        // Thud sound
        const duration = 0.2;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const freq = 150 - 50 * t;
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-10 * t);
        }
        
        return buffer;
    }

    generateClearSound() {
        // Rising success sound
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const freq = 440 + 440 * t;
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2 * t);
        }
        
        return buffer;
    }

    generateLevelUpSound() {
        // Ascending arpeggio
        const duration = 0.5;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        const notes = [440, 550, 660, 880];
        const noteLength = duration / notes.length;
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const noteIndex = Math.floor(t * notes.length);
            const noteT = (t * notes.length) % 1;
            const freq = notes[noteIndex];
            data[i] = Math.sin(2 * Math.PI * freq * noteT) * Math.exp(-2 * noteT);
        }
        
        return buffer;
    }

    generateGameOverSound() {
        // Descending pattern
        const duration = 1.0;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const freq = 440 * Math.pow(0.5, t);
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2 * t);
        }
        
        return buffer;
    }

    async audioBufferToBlob(buffer) {
        // Create offline context for rendering
        const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
        
        // Create buffer source
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineContext.destination);
        source.start();

        // Render audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV format
        const wavData = this.audioBufferToWav(renderedBuffer);
        
        // Create blob
        return new Blob([wavData], { type: 'audio/wav' });
    }

    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const buffer32 = new Int32Array(44 + buffer.length * bytesPerSample);
        const view = new DataView(buffer32.buffer);
        
        // Write WAV header
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + buffer.length * bytesPerSample, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, buffer.length * bytesPerSample, true);
        
        // Write audio data
        const offset = 44;
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset + i * bytesPerSample, sample * 0x7FFF, true);
        }
        
        return buffer32.buffer;
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Create instance and generate sounds
const generator = new SoundGenerator();
generator.generateSounds(); 
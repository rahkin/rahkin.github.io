import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create sounds directory if it doesn't exist
const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Sound generation parameters
const SOUND_PARAMS = {
    eat: {
        type: 'bite',
        frequency: 880,
        duration: 0.1,
        volume: 0.5
    },
    gameOver: {
        type: 'dramatic',
        frequency: 440,
        duration: 0.5,
        volume: 0.7
    },
    powerUp: {
        type: 'arpeggio',
        frequency: 440,
        duration: 0.3,
        volume: 0.6
    },
    turn: {
        type: 'whoosh',
        frequency: 660,
        duration: 0.05,
        volume: 0.4
    },
    background: {
        type: 'coffeeshop',
        duration: 30,
        volume: 0.3,
        layers: [
            { type: 'ambience', frequency: 220, volume: 0.2 },
            { type: 'chatter', frequency: 1000, volume: 0.1 },
            { type: 'cups', frequency: 2000, volume: 0.05 },
            { type: 'music', frequency: 440, volume: 0.15 }
        ]
    },
    click: {
        type: 'click',
        frequency: 550,
        duration: 0.08,
        volume: 0.4
    }
};

// Generate PCM audio data
function generatePCM(params) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * params.duration);
    const data = new Float32Array(numSamples);
    
    if (params.type === 'coffeeshop') {
        return generateCoffeeshopPCM(params);
    }
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        switch (params.type) {
            case 'bite':
                // Short, sharp attack with quick decay
                sample = Math.sin(2 * Math.PI * params.frequency * t) *
                        Math.exp(-t * 20);
                break;
                
            case 'dramatic':
                // Descending frequency with reverb
                const freq = params.frequency * (1 - t / params.duration);
                sample = Math.sin(2 * Math.PI * freq * t) *
                        Math.exp(-t * 2);
                break;
                
            case 'arpeggio':
                // Rising sequence of notes
                const freqMult = 1 + Math.floor(t * 10) % 3;
                sample = Math.sin(2 * Math.PI * params.frequency * freqMult * t) *
                        Math.exp(-t * 5);
                break;
                
            case 'whoosh':
                // Quick frequency sweep
                const sweepFreq = params.frequency * (1 + t * 10);
                sample = Math.sin(2 * Math.PI * sweepFreq * t) *
                        Math.exp(-t * 30);
                break;
                
            case 'click':
                // Very short, sharp click
                sample = Math.sin(2 * Math.PI * params.frequency * t) *
                        Math.exp(-t * 50);
                break;
        }
        
        data[i] = sample * params.volume;
    }
    
    return data;
}

// Generate coffee shop ambience
function generateCoffeeshopPCM(params) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * params.duration);
    const data = new Float32Array(numSamples);
    
    // Generate each layer
    for (const layer of params.layers) {
        const layerData = new Float32Array(numSamples);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            switch (layer.type) {
                case 'ambience':
                    // Brown noise for general ambience
                    sample = Math.random() * 2 - 1;
                    sample *= Math.exp(-t * 0.1);
                    break;
                    
                case 'chatter':
                    // Filtered noise for background chatter
                    const chatterFreq = layer.frequency * (1 + 0.1 * Math.sin(2 * Math.PI * 0.1 * t));
                    sample = Math.sin(2 * Math.PI * chatterFreq * t) * (Math.random() * 0.5 + 0.5);
                    break;
                    
                case 'cups':
                    // Random high-frequency clicks
                    if (Math.random() < 0.001) {
                        sample = Math.sin(2 * Math.PI * layer.frequency * t) * Math.exp(-(t % 0.1) * 50);
                    }
                    break;
                    
                case 'music':
                    // Soft background melody
                    const note = Math.floor(t * 2) % 4;
                    const freq = layer.frequency * Math.pow(1.05946, note);
                    sample = Math.sin(2 * Math.PI * freq * t) * 0.5 * (1 + Math.sin(2 * Math.PI * 0.25 * t));
                    break;
            }
            
            layerData[i] = sample * layer.volume;
        }
        
        // Add layer to main data
        for (let i = 0; i < numSamples; i++) {
            data[i] += layerData[i];
        }
    }
    
    // Normalize
    let maxAmplitude = 0;
    for (let i = 0; i < numSamples; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
    }
    
    if (maxAmplitude > 0) {
        for (let i = 0; i < numSamples; i++) {
            data[i] = (data[i] / maxAmplitude) * params.volume;
        }
    }
    
    return data;
}

// Convert PCM data to WAV format
function createWAV(pcmData) {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    
    const dataSize = pcmData.length * 2; // 16-bit samples
    const fileSize = 44 + dataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // WAV Header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Convert float PCM to 16-bit samples
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
        const sample = Math.max(-1, Math.min(1, pcmData[i]));
        const value = Math.floor(sample * 32767);
        buffer.writeInt16LE(value, offset);
        offset += 2;
    }
    
    return buffer;
}

// Generate all sounds
async function generateAllSounds() {
    console.log('Starting sound generation...');
    
    // Delete existing sound files
    fs.readdirSync(SOUNDS_DIR).forEach(file => {
        if (file.endsWith('.wav')) {
            fs.unlinkSync(path.join(SOUNDS_DIR, file));
        }
    });
    
    // Generate all sounds
    for (const [name, params] of Object.entries(SOUND_PARAMS)) {
        console.log(`Generating ${name} sound...`);
        const pcmData = generatePCM(params);
        const wavData = createWAV(pcmData);
        fs.writeFileSync(path.join(SOUNDS_DIR, `${name}.wav`), wavData);
        console.log(`Generated: ${name}.wav`);
    }
    
    console.log('All sound files generated successfully!');
}

// Run the generation
generateAllSounds().catch(console.error); 
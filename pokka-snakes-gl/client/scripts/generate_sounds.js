import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create sounds directory if it doesn't exist
const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds');
fs.ensureDirSync(SOUNDS_DIR);

// Sound generation parameters
const SOUND_PARAMS = {
    eat: {
        type: 'bite',
        frequency: 880,
        duration: 0.1,
        envelope: '0 0.1',
        volume: 0.5
    },
    gameOver: {
        type: 'dramatic',
        frequency: 440,
        duration: 0.5,
        envelope: '0 0.5',
        volume: 0.7
    },
    powerUp: {
        type: 'arpeggio',
        frequency: 440,
        duration: 0.3,
        envelope: '0 0.3',
        volume: 0.6
    },
    turn: {
        type: 'whoosh',
        frequency: 660,
        duration: 0.05,
        envelope: '0 0.05',
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
        envelope: '0 0.08',
        volume: 0.4
    },
    rain: {
        type: 'noise',
        frequency: 1000,
        duration: 10,
        envelope: '0 10',
        volume: 0.3,
        filter: 'lowpass'
    },
    snow: {
        type: 'noise',
        frequency: 800,
        duration: 10,
        envelope: '0 10',
        volume: 0.2,
        filter: 'highpass'
    },
    wind: {
        type: 'noise',
        frequency: 200,
        duration: 10,
        envelope: '0 10',
        volume: 0.3,
        filter: 'bandpass'
    }
};

// Generate a single sound using Web Audio API
async function generateSound(name, params) {
    return new Promise((resolve, reject) => {
        const htmlPath = path.join(__dirname, 'temp.html');
        const outputPath = path.join(SOUNDS_DIR, `${name}.mp3`);
        
        // Create a temporary HTML file for sound generation
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Sound Generator</title></head>
            <body>
                <script>
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const mediaRecorder = new MediaRecorder(audioContext.destination.stream);
                    const chunks = [];

                    function generateCoffeeshopAmbience(params) {
                        const masterGain = audioContext.createGain();
                        masterGain.gain.value = params.volume;
                        masterGain.connect(audioContext.destination);

                        // Generate layers of ambient sounds
                        params.layers.forEach(layer => {
                            const oscillator = audioContext.createOscillator();
                            const gain = audioContext.createGain();
                            const noise = audioContext.createBufferSource();
                            
                            // Create noise buffer for ambient effects
                            const bufferSize = audioContext.sampleRate * params.duration;
                            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                            const data = buffer.getChannelData(0);
                            
                            for (let i = 0; i < bufferSize; i++) {
                                data[i] = Math.random() * 2 - 1;
                            }
                            
                            noise.buffer = buffer;
                            noise.loop = true;
                            
                            // Apply specific processing based on layer type
                            if (layer.type === 'chatter') {
                                const filter = audioContext.createBiquadFilter();
                                filter.type = 'bandpass';
                                filter.frequency.value = layer.frequency;
                                filter.Q.value = 1;
                                noise.connect(filter);
                                filter.connect(gain);
                            } else if (layer.type === 'cups') {
                                const filter = audioContext.createBiquadFilter();
                                filter.type = 'highpass';
                                filter.frequency.value = layer.frequency;
                                oscillator.connect(filter);
                                filter.connect(gain);
                            } else {
                                noise.connect(gain);
                            }
                            
                            gain.gain.value = layer.volume;
                            gain.connect(masterGain);
                            noise.start();
                            
                            if (oscillator) {
                                oscillator.start();
                            }
                        });
                    }

                    function generateSound(params) {
                        if (params.type === 'coffeeshop') {
                            generateCoffeeshopAmbience(params);
                            return;
                        }

                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.type = params.type === 'noise' ? 'sawtooth' : 'sine';
                        oscillator.frequency.value = params.frequency;
                        
                        if (params.filter) {
                            const filter = audioContext.createBiquadFilter();
                            filter.type = params.filter;
                            filter.frequency.value = params.frequency;
                            oscillator.connect(filter);
                            filter.connect(gainNode);
                        } else {
                            oscillator.connect(gainNode);
                        }
                        
                        gainNode.connect(audioContext.destination);
                        gainNode.gain.value = params.volume;
                        
                        // Apply envelope
                        const [attackTime, releaseTime] = params.envelope.split(' ').map(Number);
                        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(params.volume, audioContext.currentTime + attackTime);
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + releaseTime);
                        
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + params.duration);
                    }

                    // Start recording
                    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'audio/mp3' });
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result.split(',')[1];
                            console.log(base64data); // This will be captured by Node.js
                        };
                        reader.readAsDataURL(blob);
                    };

                    // Generate and record the sound
                    mediaRecorder.start();
                    generateSound(${JSON.stringify(params)});
                    setTimeout(() => mediaRecorder.stop(), ${params.duration * 1000 + 500});
                </script>
            </body>
            </html>
        `;
        
        fs.writeFileSync(htmlPath, html);
        
        // Use Puppeteer to run the HTML file and capture the audio
        const puppeteer = require('puppeteer');
        (async () => {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            
            // Capture console.log output (base64 audio data)
            page.on('console', async (msg) => {
                const base64Data = msg.text();
                fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
                await browser.close();
                fs.unlinkSync(htmlPath);
                resolve();
            });
            
            await page.goto(`file://${htmlPath}`);
        })().catch(reject);
    });
}

// Generate all sounds
async function generateAllSounds() {
    console.log('Starting sound generation...');
    
    // Delete existing sound files
    fs.emptyDirSync(SOUNDS_DIR);
    
    // Generate all sounds
    for (const [name, params] of Object.entries(SOUND_PARAMS)) {
        console.log(`Generating ${name} sound...`);
        await generateSound(name, params);
        console.log(`Generated: ${name}.mp3`);
    }
    
    console.log('All sound files generated successfully!');
}

// Run the generation
generateAllSounds().catch(console.error); 
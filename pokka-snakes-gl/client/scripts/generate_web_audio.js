const fs = require('fs');
const path = require('path');

// Create sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, '../public/sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Create an HTML file that will generate the sounds
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Sound Generator</title>
</head>
<body>
    <script>
        // Function to generate a sound
        function generateSound(frequency, duration, volume) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.value = volume;
            
            // Apply fade
            gainNode.gain.setValueAtTime(0, 0);
            gainNode.gain.linearRampToValueAtTime(volume, 0.1);
            gainNode.gain.linearRampToValueAtTime(0, duration);
            
            oscillator.start(0);
            oscillator.stop(duration);
            
            return audioContext;
        }

        // Generate all sounds
        const sounds = [
            { name: 'eat', freq: 880, duration: 0.1, volume: 0.5 },
            { name: 'game_over', freq: 440, duration: 0.5, volume: 0.7 },
            { name: 'power_up', freq: 440, duration: 0.3, volume: 0.6 },
            { name: 'turn', freq: 660, duration: 0.05, volume: 0.4 },
            { name: 'background', freq: 220, duration: 2, volume: 0.3 },
            { name: 'click', freq: 550, duration: 0.08, volume: 0.4 },
            { name: 'rain', freq: 1000, duration: 1, volume: 0.3 },
            { name: 'snow', freq: 800, duration: 1, volume: 0.2 },
            { name: 'wind', freq: 200, duration: 1, volume: 0.3 }
        ];

        // Generate each sound
        sounds.forEach(sound => {
            generateSound(sound.freq, sound.duration, sound.volume);
        });

        // Log completion
        console.log('Sound generation complete!');
    </script>
</body>
</html>`;

// Write the HTML file
const htmlPath = path.join(__dirname, 'sound_generator.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('Please open sound_generator.html in your browser to generate the sounds.');
console.log('After generating the sounds, they will be available in the browser\'s audio context.'); 
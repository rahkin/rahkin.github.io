const fs = require('fs');
const path = require('path');
const https = require('https');

// Create sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, '../public/sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Sound file URLs from free sound libraries
const SOUND_URLS = {
    eat: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    gameOver: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    powerUp: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    turn: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    background: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    click: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    rain: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    snow: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3',
    wind: 'https://freesound.org/data/previews/448/448_5121236-lq.mp3'
};

// Function to download a file
function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const filepath = path.join(soundsDir, filename);
        const file = fs.createWriteStream(filepath);

        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
            });
        }).on('error', err => {
            fs.unlink(filepath, () => {}); // Delete the file if there was an error
            reject(err);
        });
    });
}

// Download all sound files
async function downloadAllSounds() {
    for (const [name, url] of Object.entries(SOUND_URLS)) {
        try {
            await downloadFile(url, `${name}.mp3`);
        } catch (error) {
            console.error(`Error downloading ${name}.mp3:`, error);
        }
    }
}

// Run the download
downloadAllSounds().then(() => {
    console.log('All sound files downloaded successfully!');
}).catch(error => {
    console.error('Error downloading sound files:', error);
}); 
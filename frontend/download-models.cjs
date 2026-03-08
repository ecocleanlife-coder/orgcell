const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model.weights',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model.weights',
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model.weights'
];

const downloadFile = (file) => {
    return new Promise((resolve, reject) => {
        const dest = path.join(modelsDir, file);
        if (fs.existsSync(dest)) {
            console.log(`Skipping ${file} (already exists)`);
            return resolve();
        }

        console.log(`Downloading ${file}...`);
        const fileStream = fs.createWriteStream(dest);
        https.get(baseUrl + file, (response) => {
            if (response.statusCode !== 200) {
                fileStream.close();
                fs.unlinkSync(dest);
                return reject(new Error(`Failed to get ${file} (${response.statusCode})`));
            }
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${file}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
};

async function downloadAll() {
    try {
        for (const file of files) {
            await downloadFile(file);
        }
        console.log('All models downloaded successfully!');
    } catch (e) {
        console.error('Error downloading models:', e);
        process.exit(1);
    }
}

downloadAll();

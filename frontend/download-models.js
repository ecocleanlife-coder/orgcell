import fs from 'fs';
import path from 'path';

const modelsDir = path.join(process.cwd(), 'public', 'models');
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

async function downloadFile(file) {
    const dest = path.join(modelsDir, file);
    if (fs.existsSync(dest)) {
        console.log(`Skipping ${file} (already exists)`);
        return;
    }

    console.log(`Downloading ${file}...`);
    try {
        const response = await fetch(baseUrl + file);
        if (!response.ok) throw new Error(`Failed to fetch ${file}: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        fs.writeFileSync(dest, buffer);
        console.log(`Downloaded ${file}`);
    } catch (err) {
        console.error(`Error with ${file}:`, err.message);
        throw err;
    }
}

async function downloadAll() {
    try {
        for (const file of files) {
            await downloadFile(file);
        }
        console.log('All models downloaded successfully!');
    } catch (e) {
        console.error('Download process failed', e);
        process.exit(1);
    }
}

downloadAll();

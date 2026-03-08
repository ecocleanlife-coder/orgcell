import * as faceapi from 'face-api.js';

let isModelLoaded = false;
let faceMatcher = null;

// Initialize models internally in the worker
const loadModels = async (originUrl) => {
    try {
        // Provide the absolute URL for the worker environment
        const modelUrl = `${originUrl}/models`;
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        isModelLoaded = true;
        self.postMessage({ type: 'STATUS', payload: 'Models loaded in worker' });
    } catch (e) {
        console.error("Worker Model Load Error:", e);
        self.postMessage({ type: 'ERROR', payload: 'Failed to load models' });
    }
};

const updateFaceMatcher = (registeredFaces) => {
    if (!registeredFaces || registeredFaces.length === 0) {
        faceMatcher = null;
        return;
    }

    try {
        const labeledDescriptors = registeredFaces.map(f =>
            new faceapi.LabeledFaceDescriptors(f.label, [new Float32Array(f.descriptor)])
        );
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 distance threshold
        self.postMessage({ type: 'STATUS', payload: `Matcher initialized with ${registeredFaces.length} labels` });
    } catch (e) {
        console.error("Worker FaceMatcher Error:", e);
    }
};

const processImage = async (imageId, imageDataUrl) => {
    if (!isModelLoaded) {
        self.postMessage({ type: 'ERROR', payload: 'Models not loaded yet' });
        return;
    }

    try {
        // Create an Image bitmap or HTMLImageElement-like object that face-api can read from dataUrl
        // Because DOM Image is not available in WebWorker, faceapi.js provides 'fetchImage' 
        // We will fetch it from the blob URL passed by the main thread
        const img = await faceapi.fetchImage(imageDataUrl);

        // Detect all faces
        const detections = await faceapi.detectAllFaces(
            img,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();

        const results = [];

        if (detections.length > 0 && faceMatcher) {
            detections.forEach(d => {
                const bestMatch = faceMatcher.findBestMatch(d.descriptor);
                results.push({
                    label: bestMatch.label, // 'unknown' if distance > 0.6
                    distance: bestMatch.distance,
                    box: d.detection.box,
                    descriptor: Array.from(d.descriptor)
                });
            });
        } else if (detections.length > 0) {
            // Found faces but no registered references
            detections.forEach(d => {
                results.push({
                    label: 'unknown',
                    distance: 1.0,
                    box: d.detection.box,
                    descriptor: Array.from(d.descriptor)
                });
            });
        }

        self.postMessage({
            type: 'SCAN_COMPLETE',
            payload: {
                imageId,
                faces: results
            }
        });

    } catch (e) {
        console.error(`Worker matching error for ${imageId}:`, e);
        self.postMessage({ type: 'ERROR', payload: e.message });
    }
};

// Message Router
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            await loadModels(payload.origin);
            break;
        case 'SET_LABELS':
            updateFaceMatcher(payload);
            break;
        case 'SCAN_IMAGE':
            await processImage(payload.imageId, payload.dataUrl);
            break;
        default:
            console.warn("Unknown worker command:", type);
    }
};

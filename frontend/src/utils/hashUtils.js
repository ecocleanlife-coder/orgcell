/**
 * Compute difference hash (dHash) from an image data URL
 * Algorithmic steps:
 * 1. Resize to 9x8 pixels
 * 2. Convert to Grayscale
 * 3. Compare adjacent pixels horizontally
 * 4. Generate 64-bit binary string -> convert to hex
 */
export async function computeDHash(imageDataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            // We need 9 columns and 8 rows to get 8 differences per row (8x8 = 64 bits)
            const width = 9;
            const height = 8;
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            // Draw original image scaled down to 9x8
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Convert to grayscale values
            const grays = [];
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // simple luminance formula
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                grays.push(gray);
            }

            // Compute difference
            let binaryString = "";
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width - 1; x++) {
                    const leftPixel = grays[y * width + x];
                    const rightPixel = grays[y * width + (x + 1)];
                    // If left is brighter/equal to right, it's 1. Otherwise 0.
                    binaryString += leftPixel >= rightPixel ? "1" : "0";
                }
            }

            // Convert 64-bit binary to 16-char Hex string
            let hexHash = "";
            for (let i = 0; i < 64; i += 4) {
                const nibble = binaryString.substring(i, i + 4);
                hexHash += parseInt(nibble, 2).toString(16);
            }

            resolve(hexHash);
        };

        img.onerror = () => reject(new Error("Failed to load image for dHash computation"));
    });
}

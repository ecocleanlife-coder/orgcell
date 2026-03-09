export const addWatermarkToImage = (imageSrc, watermarkText = "Orgcell Protected") => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Add watermark text to bottom right
            const fontSize = Math.max(16, Math.floor(canvas.width * 0.03));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';

            // Add shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            const padding = Math.floor(canvas.width * 0.02);
            ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);

            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas to Blob failed"));
                }
            }, 'image/jpeg', 0.9);
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
};

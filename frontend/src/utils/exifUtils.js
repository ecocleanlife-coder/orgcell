import exifr from 'exifr';

/**
 * Extracts EXIF data (Date, GPS, Camera Model, Dimensions) from an image file/blob.
 * @param {File|Blob} file The image file to parse
 * @returns {Promise<Object>} An object containing the extracted metadata
 */
export const extractExif = async (file) => {
    try {
        // We request specifically the tags we need to optimize performance
        // 'ifd0' contains camera Make/Model
        // 'exif' contains DateTimeOriginal, ExifImageWidth/Height
        // 'gps' contains GPS coordinates
        const exifData = await exifr.parse(file, {
            ifd0: ['Make', 'Model', 'ImageWidth', 'ImageLength'],
            exif: ['DateTimeOriginal', 'ExifImageWidth', 'ExifImageHeight'],
            gps: true
        });

        if (!exifData) {
            return { takenAt: null, location: null, metadata: null, width: null, height: null };
        }

        // 1. Date Taken
        let takenAt = null;
        if (exifData.DateTimeOriginal) {
            // Some cameras store it as a Date object, some as a string
            takenAt = new Date(exifData.DateTimeOriginal).toISOString();
        }

        // 2. GPS Location
        let location = null;
        if (exifData.latitude && exifData.longitude) {
            location = {
                lat: exifData.latitude,
                lng: exifData.longitude
            };
        }

        // 3. Camera Metadata
        let metadata = { camera: null };
        if (exifData.Make || exifData.Model) {
            const make = exifData.Make ? String(exifData.Make).trim() : '';
            const model = exifData.Model ? String(exifData.Model).trim() : '';
            // Avoid duplicate strings like "Apple Apple iPhone 14"
            const makeLower = make.toLowerCase();
            const modelLower = model.toLowerCase();
            if (make && model && !modelLower.startsWith(makeLower)) {
                metadata.camera = `${make} ${model}`.trim();
            } else {
                metadata.camera = model || make;
            }
        }

        // 4. Dimensions
        let width = exifData.ExifImageWidth || exifData.ImageWidth || null;
        let height = exifData.ExifImageHeight || exifData.ImageLength || null;

        return {
            takenAt,
            location,
            metadata: metadata.camera ? metadata : null,
            width,
            height
        };
    } catch (error) {
        console.warn('Failed to extract EXIF data (might be missing or unsupported format):', error);
        // Fail gracefully so upload pipeline doesn't break
        return { takenAt: null, location: null, metadata: null, width: null, height: null };
    }
};

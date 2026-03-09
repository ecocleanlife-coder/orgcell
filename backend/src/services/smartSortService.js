/**
 * Smart Sort Service — Antigravity Engine (Go → Node.js port)
 *
 * Ported from: 사진정리antigravity/ (Go CLI)
 * Original modules: scanner, dedup (xxHash), metadata (EXIF), organizer (YYYY/MM/DD)
 *
 * This service handles server-side file scanning, deduplication,
 * EXIF metadata extraction, and date-based organization.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Supported media extensions (from Go scanner.SupportedExtensions)
const SUPPORTED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.heic', '.webp',
    '.raw', '.cr2', '.nef', '.arw', '.dng',
    '.mov', '.mp4', '.avi', '.mkv', '.3gp',
    '.gif', '.bmp', '.tiff', '.tif',
]);

// Small image threshold (pixels)
const SMALL_IMAGE_THRESHOLD = 200;

/**
 * Scan a directory recursively for media files
 * Port of: pkg/scanner/scanner.go
 */
async function scanDirectory(dirPath, options = {}) {
    const {
        includeSmall = false,
        onProgress = null,
        signal = null,
    } = options;

    const results = [];
    let scannedCount = 0;

    async function walk(currentPath) {
        if (signal && signal.aborted) return;

        let entries;
        try {
            entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        } catch (err) {
            // Permission denied or invalid path — skip
            return;
        }

        for (const entry of entries) {
            if (signal && signal.aborted) return;

            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                // Skip hidden dirs and system dirs
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') {
                    continue;
                }
                await walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (SUPPORTED_EXTENSIONS.has(ext)) {
                    try {
                        const stat = await fs.promises.stat(fullPath);
                        scannedCount++;
                        results.push({
                            path: fullPath,
                            name: entry.name,
                            ext,
                            size: stat.size,
                            modifiedAt: stat.mtime,
                        });

                        if (onProgress && scannedCount % 50 === 0) {
                            onProgress({ scanned: scannedCount });
                        }
                    } catch (err) {
                        // File stat failed — skip
                    }
                }
            }
        }
    }

    await walk(dirPath);
    return results;
}

/**
 * Calculate file hash for deduplication
 * Port of: pkg/dedup/hash.go (xxHash → SHA-256 for Node.js)
 * Uses streaming hash to handle large files efficiently
 */
async function calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Extract date from file (EXIF fallback to mtime)
 * Port of: pkg/metadata/exif.go
 * Reads EXIF DateTimeOriginal from JPEG files, falls back to file mtime
 */
async function extractDate(filePath) {
    const stat = await fs.promises.stat(filePath);
    const fallbackDate = stat.mtime;

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg') {
        return fallbackDate;
    }

    try {
        // Read first 64KB for EXIF data (EXIF is always in the header)
        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(65536);
        await fd.read(buffer, 0, 65536, 0);
        await fd.close();

        const dateStr = parseExifDate(buffer);
        if (dateStr) {
            // EXIF date format: "YYYY:MM:DD HH:MM:SS"
            const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    } catch (err) {
        // EXIF parse failed — use fallback
    }

    return fallbackDate;
}

/**
 * Minimal EXIF DateTimeOriginal parser (no dependencies)
 * Reads JPEG EXIF header and finds DateTimeOriginal tag (0x9003)
 */
function parseExifDate(buffer) {
    // Check JPEG SOI marker
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;

    let offset = 2;
    while (offset < buffer.length - 4) {
        if (buffer[offset] !== 0xFF) break;

        const marker = buffer[offset + 1];
        if (marker === 0xE1) {
            // APP1 (EXIF) segment
            const segLen = buffer.readUInt16BE(offset + 2);
            const exifData = buffer.slice(offset + 4, offset + 2 + segLen);

            // Check "Exif\0\0" header
            if (exifData.toString('ascii', 0, 4) === 'Exif') {
                return findDateInExif(exifData.slice(6));
            }
        }

        const segLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLength;
    }
    return null;
}

function findDateInExif(tiffData) {
    if (tiffData.length < 8) return null;

    const isLE = tiffData.toString('ascii', 0, 2) === 'II';
    const read16 = isLE
        ? (buf, off) => buf.readUInt16LE(off)
        : (buf, off) => buf.readUInt16BE(off);
    const read32 = isLE
        ? (buf, off) => buf.readUInt32LE(off)
        : (buf, off) => buf.readUInt32BE(off);

    try {
        const ifdOffset = read32(tiffData, 4);
        return searchIFD(tiffData, ifdOffset, read16, read32);
    } catch (err) {
        return null;
    }
}

function searchIFD(data, offset, read16, read32) {
    if (offset + 2 > data.length) return null;

    const count = read16(data, offset);
    for (let i = 0; i < count; i++) {
        const entryOffset = offset + 2 + i * 12;
        if (entryOffset + 12 > data.length) break;

        const tag = read16(data, entryOffset);

        // 0x8769 = ExifIFD pointer
        if (tag === 0x8769) {
            const subIfdOffset = read32(data, entryOffset + 8);
            const result = searchIFD(data, subIfdOffset, read16, read32);
            if (result) return result;
        }

        // 0x9003 = DateTimeOriginal, 0x9004 = DateTimeDigitized, 0x0132 = DateTime
        if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
            const valueOffset = read32(data, entryOffset + 8);
            if (valueOffset + 19 <= data.length) {
                const dateStr = data.toString('ascii', valueOffset, valueOffset + 19);
                if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    return dateStr;
                }
            }
        }
    }
    return null;
}

/**
 * Get image dimensions without loading full image
 * Returns { width, height } or null if not determinable
 */
async function getImageDimensions(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        return null;
    }

    try {
        const fd = await fs.promises.open(filePath, 'r');
        const header = Buffer.alloc(30);
        await fd.read(header, 0, 30, 0);
        await fd.close();

        // PNG
        if (header[0] === 0x89 && header[1] === 0x50) {
            return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
        }

        // GIF
        if (header.toString('ascii', 0, 3) === 'GIF') {
            return { width: header.readUInt16LE(6), height: header.readUInt16LE(8) };
        }

        // BMP
        if (header.toString('ascii', 0, 2) === 'BM') {
            return { width: header.readUInt32LE(18), height: Math.abs(header.readInt32LE(22)) };
        }

        // JPEG — need to find SOF marker
        if (header[0] === 0xFF && header[1] === 0xD8) {
            return await getJpegDimensions(filePath);
        }
    } catch (err) {
        // Can't determine dimensions
    }

    return null;
}

async function getJpegDimensions(filePath) {
    const fd = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(65536);
    const { bytesRead } = await fd.read(buf, 0, 65536, 0);
    await fd.close();

    let offset = 2;
    while (offset < bytesRead - 8) {
        if (buf[offset] !== 0xFF) break;
        const marker = buf[offset + 1];
        // SOF markers (0xC0-0xCF except 0xC4 and 0xCC)
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xCC) {
            const height = buf.readUInt16BE(offset + 5);
            const width = buf.readUInt16BE(offset + 7);
            return { width, height };
        }
        const len = buf.readUInt16BE(offset + 2);
        offset += 2 + len;
    }
    return null;
}

/**
 * Generate target path based on date (YYYY/MM/DD structure)
 * Port of: pkg/organizer/worker.go GenerateTargetPath()
 */
function generateTargetPath(targetDir, dateTaken) {
    const year = dateTaken.getFullYear().toString();
    const month = (dateTaken.getMonth() + 1).toString().padStart(2, '0');
    const day = dateTaken.getDate().toString().padStart(2, '0');
    return path.join(targetDir, year, month, day);
}

/**
 * Process (copy or move) a file to destination
 * Port of: pkg/organizer/worker.go ProcessFile()
 */
async function processFile(src, dst, moveMode = false) {
    // Ensure destination directory exists
    const dstDir = path.dirname(dst);
    await fs.promises.mkdir(dstDir, { recursive: true });

    // Handle filename collision
    let finalDst = dst;
    try {
        await fs.promises.access(finalDst);
        // File exists — append timestamp
        const ext = path.extname(dst);
        const base = path.basename(dst, ext);
        finalDst = path.join(dstDir, `${base}_${Date.now()}${ext}`);
    } catch {
        // File doesn't exist — good
    }

    if (moveMode) {
        try {
            await fs.promises.rename(src, finalDst);
            return finalDst;
        } catch {
            // Cross-device move — fall through to copy+delete
        }
    }

    await fs.promises.copyFile(src, finalDst);
    if (moveMode) {
        await fs.promises.unlink(src);
    }

    return finalDst;
}

/**
 * Run full smart sort pipeline
 * Combines all Antigravity modules into one pipeline
 */
async function runSmartSort(sourcePath, destPath, options = {}) {
    const {
        dupAction = 'delete',        // 'delete' or 'move'
        deleteSmallImages = true,
        includeSmallInSearch = false,
        moveMode = false,
        onProgress = null,
    } = options;

    const stats = {
        totalScanned: 0,
        duplicatesFound: 0,
        smallImagesFound: 0,
        facesDetected: 0,
        totalSizeBytes: 0,
        savedSizeBytes: 0,
        processedFiles: 0,
        errors: 0,
        timeline: {},           // { "2026/03": count, ... }
        duplicateGroups: [],    // [{ hash, files: [...] }]
        smallImages: [],        // [{ path, width, height }]
    };

    // Phase 1: Scan
    if (onProgress) onProgress({ phase: 'scan', message: 'Scanning files...', percent: 0 });

    const files = await scanDirectory(sourcePath, {
        includeSmall: true, // scan all, filter later
        onProgress: (p) => {
            if (onProgress) onProgress({ phase: 'scan', message: `Scanning... ${p.scanned} files found`, percent: 10 });
        },
    });

    stats.totalScanned = files.length;
    stats.totalSizeBytes = files.reduce((sum, f) => sum + f.size, 0);

    // Phase 2: Hash & Dedup
    if (onProgress) onProgress({ phase: 'hash', message: 'Computing file hashes...', percent: 20 });

    const hashMap = new Map(); // hash → [files]
    for (let i = 0; i < files.length; i++) {
        try {
            const hash = await calculateFileHash(files[i].path);
            files[i].hash = hash;

            if (!hashMap.has(hash)) {
                hashMap.set(hash, []);
            }
            hashMap.get(hash).push(files[i]);
        } catch (err) {
            stats.errors++;
        }

        if (onProgress && i % 20 === 0) {
            const pct = 20 + Math.floor((i / files.length) * 30);
            onProgress({ phase: 'hash', message: `Hashing... ${i}/${files.length}`, percent: pct });
        }
    }

    // Find duplicate groups
    for (const [hash, group] of hashMap) {
        if (group.length > 1) {
            stats.duplicatesFound += group.length - 1;
            stats.savedSizeBytes += group.slice(1).reduce((sum, f) => sum + f.size, 0);
            stats.duplicateGroups.push({ hash, files: group });
        }
    }

    // Phase 3: Detect small images
    if (onProgress) onProgress({ phase: 'dimensions', message: 'Checking image dimensions...', percent: 55 });

    const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(f.ext));
    for (let i = 0; i < imageFiles.length; i++) {
        try {
            const dims = await getImageDimensions(imageFiles[i].path);
            if (dims) {
                imageFiles[i].width = dims.width;
                imageFiles[i].height = dims.height;

                if (dims.width <= SMALL_IMAGE_THRESHOLD && dims.height <= SMALL_IMAGE_THRESHOLD) {
                    stats.smallImagesFound++;
                    stats.smallImages.push({
                        path: imageFiles[i].path,
                        name: imageFiles[i].name,
                        width: dims.width,
                        height: dims.height,
                        size: imageFiles[i].size,
                    });
                }
            }
        } catch {
            // Skip
        }

        if (onProgress && i % 30 === 0) {
            const pct = 55 + Math.floor((i / imageFiles.length) * 15);
            onProgress({ phase: 'dimensions', message: `Checking dimensions... ${i}/${imageFiles.length}`, percent: pct });
        }
    }

    // Phase 4: Extract dates & build timeline
    if (onProgress) onProgress({ phase: 'dates', message: 'Reading dates...', percent: 72 });

    const validFiles = includeSmallInSearch ? files : files.filter(f => {
        if (!f.width || !f.height) return true; // non-image or unknown dims
        return f.width > SMALL_IMAGE_THRESHOLD || f.height > SMALL_IMAGE_THRESHOLD;
    });

    for (let i = 0; i < validFiles.length; i++) {
        try {
            const date = await extractDate(validFiles[i].path);
            validFiles[i].dateTaken = date;

            const yearMonth = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            stats.timeline[yearMonth] = (stats.timeline[yearMonth] || 0) + 1;
        } catch {
            stats.errors++;
        }

        if (onProgress && i % 30 === 0) {
            const pct = 72 + Math.floor((i / validFiles.length) * 18);
            onProgress({ phase: 'dates', message: `Reading dates... ${i}/${validFiles.length}`, percent: pct });
        }
    }

    if (onProgress) onProgress({ phase: 'done', message: 'Scan complete', percent: 100 });

    return stats;
}

/**
 * Apply smart sort results — organize files into date folders
 * Port of the main pipeline in cmd/root.go
 */
async function applySmartSort(sourcePath, destPath, scanResults, options = {}) {
    const {
        dupAction = 'delete',
        deleteSmallImages = true,
        moveMode = false,
        assignedNames = {},     // { faceGroupId: "이름" } — synced with frontend
        onProgress = null,
    } = options;

    let processed = 0;
    let moved = 0;
    let deleted = 0;
    let errors = 0;

    // Build map of file paths → assigned person name (from face groups)
    const fileToFaceName = new Map();
    if (scanResults.faceGroups) {
        for (const group of scanResults.faceGroups) {
            const name = assignedNames[group.id];
            if (name && name.trim() !== '') {
                for (const p of (group.photos || [])) {
                    fileToFaceName.set(p.path, name.trim());
                }
            }
        }
    }

    // 1. Handle duplicates
    if (onProgress) onProgress({ phase: 'dedup', message: 'Processing duplicates...', percent: 10 });

    for (const group of (scanResults.duplicateGroups || [])) {
        // Keep the largest file (best quality), process the rest
        const sorted = group.files.sort((a, b) => b.size - a.size);
        const duplicates = sorted.slice(1);

        for (const dup of duplicates) {
            try {
                if (dupAction === 'delete') {
                    await fs.promises.unlink(dup.path);
                    deleted++;
                } else if (dupAction === 'move') {
                    const dupDir = path.join(destPath, '_Duplicates');
                    await fs.promises.mkdir(dupDir, { recursive: true });
                    const dst = path.join(dupDir, dup.name);
                    await processFile(dup.path, dst, true);
                    moved++;
                }
            } catch {
                errors++;
            }
        }
    }

    // 2. Handle small images
    if (deleteSmallImages && scanResults.smallImages) {
        if (onProgress) onProgress({ phase: 'small', message: 'Cleaning small images...', percent: 30 });

        for (const small of scanResults.smallImages) {
            try {
                await fs.promises.unlink(small.path);
                deleted++;
            } catch {
                errors++;
            }
        }
    }

    // 3. Organize remaining files by face name or date
    if (onProgress) onProgress({ phase: 'organize', message: 'Organizing files...', percent: 50 });

    // Re-scan source to get remaining files (after dedup/cleanup)
    const remaining = await scanDirectory(sourcePath);
    const total = remaining.length;

    for (let i = 0; i < remaining.length; i++) {
        try {
            const faceName = fileToFaceName.get(remaining[i].path);

            let targetDir;
            if (faceName) {
                // Face-matched → People/이름/ folder
                targetDir = path.join(destPath, 'People', faceName);
            } else {
                // Date-based → YYYY/MM/DD folder
                const date = await extractDate(remaining[i].path);
                targetDir = generateTargetPath(destPath, date);
            }

            const dst = path.join(targetDir, remaining[i].name);
            await processFile(remaining[i].path, dst, moveMode);
            moved++;
            processed++;
        } catch {
            errors++;
        }

        if (onProgress && i % 10 === 0) {
            const pct = 50 + Math.floor((i / total) * 50);
            onProgress({ phase: 'organize', message: `Organizing... ${i}/${total}`, percent: pct });
        }
    }

    return { processed, moved, deleted, errors };
}

module.exports = {
    SUPPORTED_EXTENSIONS,
    SMALL_IMAGE_THRESHOLD,
    scanDirectory,
    calculateFileHash,
    extractDate,
    getImageDimensions,
    generateTargetPath,
    processFile,
    runSmartSort,
    applySmartSort,
};

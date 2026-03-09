/**
 * Smart Sort Engine — Browser-side Antigravity Engine
 *
 * Uses File System Access API to scan local directories directly in the browser.
 * No files are uploaded to any server — everything runs locally.
 *
 * Ported from: 사진정리antigravity/ (Go CLI)
 * Modules: scanner, dedup (hash), metadata (EXIF), organizer (date-based)
 */

// Supported media extensions (from Go scanner.SupportedExtensions)
const SUPPORTED_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'heic', 'webp',
    'raw', 'cr2', 'nef', 'arw', 'dng',
    'mov', 'mp4', 'avi', 'mkv', '3gp',
    'gif', 'bmp', 'tiff', 'tif',
]);

const SMALL_IMAGE_THRESHOLD = 200; // pixels

/**
 * Scan a directory handle recursively for media files
 * Port of: pkg/scanner/scanner.go Scan()
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {Function} onProgress - callback({ scanned, phase, message })
 * @returns {Promise<Array>} files with metadata
 */
export async function scanDirectory(dirHandle, onProgress) {
    const files = [];
    let scanned = 0;

    async function walk(handle, pathPrefix = '') {
        for await (const [name, entry] of handle.entries()) {
            if (entry.kind === 'directory') {
                // Skip hidden/system directories
                if (name.startsWith('.') || name === 'node_modules' || name === '$RECYCLE.BIN') {
                    continue;
                }
                await walk(entry, pathPrefix ? `${pathPrefix}/${name}` : name);
            } else if (entry.kind === 'file') {
                const ext = name.split('.').pop()?.toLowerCase();
                if (ext && SUPPORTED_EXTENSIONS.has(ext)) {
                    try {
                        const file = await entry.getFile();
                        scanned++;
                        files.push({
                            name,
                            path: pathPrefix ? `${pathPrefix}/${name}` : name,
                            ext,
                            size: file.size,
                            lastModified: new Date(file.lastModified),
                            fileHandle: entry,
                            file, // keep File reference for later processing
                        });

                        if (onProgress && scanned % 25 === 0) {
                            onProgress({ scanned, phase: 'scan', message: `파일 스캔 중... ${scanned}개 발견` });
                        }
                    } catch {
                        // File access failed — skip
                    }
                }
            }
        }
    }

    await walk(dirHandle);
    return files;
}

/**
 * Calculate SHA-256 hash of a file for deduplication
 * Port of: pkg/dedup/hash.go CalculateExactHash()
 * Uses Web Crypto API (SubtleCrypto)
 */
export async function calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get image dimensions by loading into an Image element
 * Returns { width, height } or null
 */
export function getImageDimensions(file) {
    return new Promise((resolve) => {
        // Only check actual image types
        if (!file.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(file.name.split('.').pop()?.toLowerCase())) {
            resolve(null);
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            resolve(null);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
}

/**
 * Extract EXIF DateTimeOriginal from JPEG files
 * Port of: pkg/metadata/exif.go ExtractDate()
 * Minimal EXIF parser — no dependencies required
 */
export async function extractExifDate(file) {
    const fallback = new Date(file.lastModified);

    if (!file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
        return fallback;
    }

    try {
        const headerSlice = file.slice(0, 65536);
        const buffer = await headerSlice.arrayBuffer();
        const view = new DataView(buffer);

        // Check JPEG SOI
        if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) return fallback;

        let offset = 2;
        while (offset < buffer.byteLength - 4) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);

            if (marker === 0xE1) {
                // APP1 — EXIF
                const segLen = view.getUint16(offset + 2);
                const exifStart = offset + 4;

                // Check "Exif\0\0"
                const exifHeader = String.fromCharCode(
                    view.getUint8(exifStart), view.getUint8(exifStart + 1),
                    view.getUint8(exifStart + 2), view.getUint8(exifStart + 3)
                );
                if (exifHeader === 'Exif') {
                    const tiffStart = exifStart + 6;
                    const dateStr = findExifDate(view, tiffStart, buffer.byteLength);
                    if (dateStr) {
                        const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
                        if (!isNaN(parsed.getTime())) return parsed;
                    }
                }
            }

            const segLength = view.getUint16(offset + 2);
            offset += 2 + segLength;
        }
    } catch {
        // EXIF parse failed
    }

    return fallback;
}

function findExifDate(view, tiffStart, maxLen) {
    if (tiffStart + 8 > maxLen) return null;

    const byteOrder = view.getUint16(tiffStart);
    const isLE = byteOrder === 0x4949; // 'II'

    const read16 = (off) => isLE ? view.getUint16(off, true) : view.getUint16(off, false);
    const read32 = (off) => isLE ? view.getUint32(off, true) : view.getUint32(off, false);

    try {
        const ifdOffset = read32(tiffStart + 4);
        return searchIFD(view, tiffStart, tiffStart + ifdOffset, read16, read32, maxLen);
    } catch {
        return null;
    }
}

function searchIFD(view, tiffStart, offset, read16, read32, maxLen) {
    if (offset + 2 > maxLen) return null;
    const count = read16(offset);

    for (let i = 0; i < count; i++) {
        const entryOffset = offset + 2 + i * 12;
        if (entryOffset + 12 > maxLen) break;

        const tag = read16(entryOffset);

        // ExifIFD pointer
        if (tag === 0x8769) {
            const subOffset = read32(entryOffset + 8);
            const result = searchIFD(view, tiffStart, tiffStart + subOffset, read16, read32, maxLen);
            if (result) return result;
        }

        // DateTimeOriginal (0x9003), DateTimeDigitized (0x9004), DateTime (0x0132)
        if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
            const valueOffset = tiffStart + read32(entryOffset + 8);
            if (valueOffset + 19 <= maxLen) {
                let dateStr = '';
                for (let j = 0; j < 19; j++) {
                    dateStr += String.fromCharCode(view.getUint8(valueOffset + j));
                }
                if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                    return dateStr;
                }
            }
        }
    }
    return null;
}

/**
 * Run the full smart sort scan pipeline (browser-side)
 * Combines scanner + dedup + dimensions + EXIF into one pipeline
 *
 * @param {FileSystemDirectoryHandle} sourceDirHandle
 * @param {Object} options
 * @param {Function} onProgress - callback({ percent, phase, message })
 * @returns {Promise<Object>} scan results
 */
export async function runScan(sourceDirHandle, options = {}) {
    const {
        deleteSmallImages = true,
        includeSmallInSearch = false,
        onProgress = () => { },
    } = options;

    onProgress({ percent: 0, phase: 'scan', message: '폴더를 스캔하는 중...' });

    // Phase 1: Scan files
    const files = await scanDirectory(sourceDirHandle, (p) => {
        onProgress({ percent: Math.min(15, Math.floor(p.scanned / 10)), phase: 'scan', message: p.message });
    });

    const totalFiles = files.length;
    if (totalFiles === 0) {
        return {
            totalScanned: 0, duplicatesFound: 0, smallImagesFound: 0,
            facesDetected: 0, savedBytes: 0, timeline: {},
            duplicateGroups: [], smallImages: [], files: [],
        };
    }

    onProgress({ percent: 15, phase: 'hash', message: `${totalFiles}개 파일의 해시를 계산하는 중...` });

    // Phase 2: Hash for dedup
    const hashMap = new Map();
    for (let i = 0; i < files.length; i++) {
        try {
            // For large files (>50MB), hash only first 1MB + last 1MB for speed
            let hashFile = files[i].file;
            if (files[i].size > 50 * 1024 * 1024) {
                const first = files[i].file.slice(0, 1024 * 1024);
                const last = files[i].file.slice(-1024 * 1024);
                hashFile = new Blob([first, last]);
            }
            const hash = await calculateFileHash(hashFile);
            files[i].hash = hash;

            if (!hashMap.has(hash)) hashMap.set(hash, []);
            hashMap.get(hash).push(files[i]);
        } catch {
            // Skip failed hash
        }

        if (i % 10 === 0) {
            onProgress({ percent: 15 + Math.floor((i / totalFiles) * 30), phase: 'hash', message: `해시 계산 중... ${i}/${totalFiles}` });
        }
    }

    // Find duplicates
    const duplicateGroups = [];
    let duplicatesFound = 0;
    let savedBytes = 0;
    for (const [hash, group] of hashMap) {
        if (group.length > 1) {
            duplicatesFound += group.length - 1;
            savedBytes += group.slice(1).reduce((s, f) => s + f.size, 0);
            duplicateGroups.push({ hash, files: group.map(f => ({ name: f.name, path: f.path, size: f.size })) });
        }
    }

    onProgress({ percent: 50, phase: 'dimensions', message: '이미지 크기를 확인하는 중...' });

    // Phase 3: Check dimensions (detect small images)
    const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']);
    const imageFiles = files.filter(f => imageExts.has(f.ext));
    const smallImages = [];

    for (let i = 0; i < imageFiles.length; i++) {
        try {
            const dims = await getImageDimensions(imageFiles[i].file);
            if (dims) {
                imageFiles[i].width = dims.width;
                imageFiles[i].height = dims.height;

                if (dims.width <= SMALL_IMAGE_THRESHOLD && dims.height <= SMALL_IMAGE_THRESHOLD) {
                    smallImages.push({
                        name: imageFiles[i].name,
                        path: imageFiles[i].path,
                        width: dims.width,
                        height: dims.height,
                        size: imageFiles[i].size,
                    });
                    savedBytes += imageFiles[i].size;
                }
            }
        } catch {
            // Skip
        }

        if (i % 15 === 0) {
            onProgress({ percent: 50 + Math.floor((i / imageFiles.length) * 20), phase: 'dimensions', message: `이미지 크기 확인 중... ${i}/${imageFiles.length}` });
        }
    }

    onProgress({ percent: 72, phase: 'dates', message: '촬영 날짜를 분석하는 중...' });

    // Phase 4: Extract dates & build timeline
    const timeline = {};
    const processFiles = includeSmallInSearch ? files : files.filter(f => {
        if (!f.width || !f.height) return true;
        return f.width > SMALL_IMAGE_THRESHOLD || f.height > SMALL_IMAGE_THRESHOLD;
    });

    for (let i = 0; i < processFiles.length; i++) {
        try {
            const date = await extractExifDate(processFiles[i].file);
            processFiles[i].dateTaken = date;

            const ym = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
            timeline[ym] = (timeline[ym] || 0) + 1;
        } catch {
            // Use lastModified as fallback
            const d = processFiles[i].lastModified;
            const ym = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            timeline[ym] = (timeline[ym] || 0) + 1;
        }

        if (i % 15 === 0) {
            onProgress({ percent: 72 + Math.floor((i / processFiles.length) * 25), phase: 'dates', message: `날짜 분석 중... ${i}/${processFiles.length}` });
        }
    }

    onProgress({ percent: 85, phase: 'faces', message: '인물을 분석하는 중...' });

    // Phase 5: Face Detection & Clustering
    let facesDetected = 0;
    const faceGroups = [];

    try {
        const worker = new Worker(new URL('../workers/faceScanWorker.js', import.meta.url), { type: 'module' });

        await new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'STATUS' && e.data.payload === 'Models loaded in worker') resolve();
                if (e.data.type === 'ERROR') reject(e.data.payload);
            };
            worker.postMessage({ type: 'INIT', payload: { origin: window.location.origin } });
        });

        worker.postMessage({ type: 'SET_LABELS', payload: [] });

        const scanImage = (file, id) => new Promise((resolve) => {
            const tempUrl = URL.createObjectURL(file);
            const handler = (e) => {
                if (e.data.type === 'SCAN_COMPLETE' && e.data.payload.imageId === id) {
                    URL.revokeObjectURL(tempUrl);
                    worker.removeEventListener('message', handler);
                    resolve(e.data.payload.faces);
                } else if (e.data.type === 'ERROR') {
                    URL.revokeObjectURL(tempUrl);
                    worker.removeEventListener('message', handler);
                    resolve([]);
                }
            };
            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'SCAN_IMAGE', payload: { imageId: id, dataUrl: tempUrl } });
        });

        for (let i = 0; i < processFiles.length; i++) {
            if (imageExts.has(processFiles[i].ext)) {
                // To avoid freezing, sequence the promises
                const faces = await scanImage(processFiles[i].file, i);
                if (faces && faces.length > 0) {
                    facesDetected += faces.length;

                    faces.forEach(f => {
                        let matchedGroup = null;
                        for (const g of faceGroups) {
                            const dist = Math.sqrt(g.descriptor.reduce((sum, val, idx) => sum + Math.pow(val - f.descriptor[idx], 2), 0));
                            if (dist < 0.6) {
                                matchedGroup = g;
                                break;
                            }
                        }
                        if (matchedGroup) {
                            matchedGroup.count++;
                            matchedGroup.photos.push({ file: processFiles[i].file, path: processFiles[i].path, box: f.box });
                        } else {
                            faceGroups.push({
                                id: faceGroups.length + 1,
                                name: '',
                                assigned: false,
                                descriptor: f.descriptor,
                                count: 1,
                                photos: [{ file: processFiles[i].file, path: processFiles[i].path, box: f.box }]
                            });
                        }
                    });
                }
            }
            if (i % 3 === 0) {
                onProgress({ percent: 85 + Math.floor((i / processFiles.length) * 14), phase: 'faces', message: `인물 분석 중... ${i}/${processFiles.length} (${facesDetected}명 찾음)` });
            }
        }
        worker.terminate();

        // Sort face groups by count descending
        faceGroups.sort((a, b) => b.count - a.count);

    } catch (e) {
        console.warn("Face scanning skipped or failed:", e);
    }

    onProgress({ percent: 100, phase: 'done', message: '스캔 완료!' });

    return {
        totalScanned: totalFiles,
        duplicatesFound,
        smallImagesFound: smallImages.length,
        facesDetected,
        savedBytes,
        timeline,
        duplicateGroups,
        smallImages,
        files: processFiles,
        faceGroups
    };
}

/**
 * Apply scan results — organize files into date-based folder structure
 * Port of: cmd/root.go main pipeline + pkg/organizer/worker.go
 *
 * @param {FileSystemDirectoryHandle} destDirHandle
 * @param {Object} scanResults - from runScan()
 * @param {Object} options
 * @param {Function} onProgress
 */
export async function applyResults(destDirHandle, scanResults, options = {}) {
    const {
        dupAction = 'delete',
        deleteSmallImages = true,
        assignedNames = {},
        onProgress = () => { },
    } = options;

    let processed = 0;
    let deleted = 0;
    let organized = 0;
    let errors = 0;

    const filesToOrganize = scanResults.files || [];
    const total = filesToOrganize.length;

    // Build map of file paths to assigned face names
    const fileToFaceName = new Map();
    if (scanResults.faceGroups) {
        for (const group of scanResults.faceGroups) {
            const name = assignedNames[group.id];
            if (name && name.trim() !== '') {
                for (const p of group.photos) {
                    fileToFaceName.set(p.path, name.trim());
                }
            }
        }
    }

    // Build set of duplicate paths to skip (keep largest in each group)
    const skipPaths = new Set();
    for (const group of (scanResults.duplicateGroups || [])) {
        const sorted = [...group.files].sort((a, b) => b.size - a.size);
        for (let i = 1; i < sorted.length; i++) {
            skipPaths.add(sorted[i].path);
        }
    }

    // Build set of small image paths to skip
    const smallPaths = new Set();
    if (deleteSmallImages) {
        for (const s of (scanResults.smallImages || [])) {
            smallPaths.add(s.path);
        }
    }

    onProgress({ percent: 5, phase: 'organize', message: '파일 정리 시작...' });

    // Create Duplicates folder if moving instead of deleting
    let dupDirHandle = null;
    if (dupAction === 'move' && skipPaths.size > 0) {
        try {
            dupDirHandle = await destDirHandle.getDirectoryHandle('_Duplicates', { create: true });
        } catch {
            // Continue without dup folder
        }
    }

    for (let i = 0; i < filesToOrganize.length; i++) {
        const f = filesToOrganize[i];

        try {
            // Skip small images
            if (smallPaths.has(f.path)) {
                deleted++;
                processed++;
                continue;
            }

            // Handle duplicates
            if (skipPaths.has(f.path)) {
                if (dupAction === 'move' && dupDirHandle && f.fileHandle) {
                    // Copy duplicate to _Duplicates folder
                    const file = await f.fileHandle.getFile();
                    const dest = await dupDirHandle.getFileHandle(f.name, { create: true });
                    const writable = await dest.createWritable();
                    await writable.write(file);
                    await writable.close();
                }
                deleted++;
                processed++;
                continue;
            }

            // Organize by Face or Date
            if (f.fileHandle) {
                const assignedName = fileToFaceName.get(f.path);

                let targetDir;
                if (assignedName) {
                    // Save to People/[Name] folder
                    const peopleDir = await destDirHandle.getDirectoryHandle('People', { create: true });
                    targetDir = await peopleDir.getDirectoryHandle(assignedName, { create: true });
                } else if (f.dateTaken) {
                    // Save to YYYY/MM folder
                    const year = f.dateTaken.getFullYear().toString();
                    const month = String(f.dateTaken.getMonth() + 1).padStart(2, '0');
                    const yearDir = await destDirHandle.getDirectoryHandle(year, { create: true });
                    targetDir = await yearDir.getDirectoryHandle(month, { create: true });
                } else {
                    // No date and no face — save to Unsorted
                    targetDir = await destDirHandle.getDirectoryHandle('Unsorted', { create: true });
                }

                const file = await f.fileHandle.getFile();
                const dest = await targetDir.getFileHandle(f.name, { create: true });
                const writable = await dest.createWritable();
                await writable.write(file);
                await writable.close();
                organized++;
            }

            processed++;
        } catch {
            errors++;
        }

        if (i % 5 === 0) {
            onProgress({
                percent: 5 + Math.floor((i / total) * 95),
                phase: 'organize',
                message: `정리 중... ${i}/${total} (${organized}장 저장됨)`,
            });
        }
    }

    onProgress({ percent: 100, phase: 'done', message: '정리 완료!' });

    return { processed, organized, deleted, errors };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

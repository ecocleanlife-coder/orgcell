/**
 * Helper to handle generation, encryption, and decryption of blobs
 * using the browser's native Web Crypto API (AES-GCM).
 */

export async function generateMasterKey() {
    return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable so we can export/backup
        ['encrypt', 'decrypt']
    );
}

export async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return btoa(JSON.stringify(exported));
}

export async function importKey(base64Str) {
    const jsonStr = atob(base64Str);
    const jwk = JSON.parse(jsonStr);
    return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptFile(file, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const arrayBuffer = await file.arrayBuffer();

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        arrayBuffer
    );

    // Combine IV and Encrypted content so they can be stored together
    const encryptedBlob = new Blob([iv, encryptedContent], { type: 'application/octet-stream' });
    return encryptedBlob;
}

// ── 얼굴 데이터 localStorage 암호화 (AES-GCM) ──

const FACE_KEY_STORAGE = 'orgcell_face_key';

async function getFaceKey() {
    const stored = localStorage.getItem(FACE_KEY_STORAGE);
    if (stored) {
        return await importKey(stored);
    }
    const key = await generateMasterKey();
    const exported = await exportKey(key);
    localStorage.setItem(FACE_KEY_STORAGE, exported);
    return key;
}

/**
 * JSON 데이터를 AES-GCM으로 암호화하여 base64 문자열로 반환
 */
export async function encryptJson(data) {
    const key = await getFaceKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );
    // iv(12) + ciphertext → base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

/**
 * base64 암호화 문자열을 복호화하여 원본 JSON 반환
 */
export async function decryptJson(base64Str) {
    const key = await getFaceKey();
    const raw = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function decryptBlob(encryptedBlob, key) {
    const arrayBuffer = await encryptedBlob.arrayBuffer();

    // Extract the first 12 bytes as the IV, the rest is the ciphertext
    const iv = arrayBuffer.slice(0, 12);
    const ciphertext = arrayBuffer.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        ciphertext
    );

    // Note: The original generic file type is lost here. 
    // Usually you store the original mime-type alongside the payload if needed.
    return new Blob([decryptedContent]);
}

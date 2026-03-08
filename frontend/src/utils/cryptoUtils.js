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

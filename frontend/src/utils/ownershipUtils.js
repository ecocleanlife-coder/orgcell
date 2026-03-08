/**
 * Utility functions for Photo Ownership Proof (Hash-based digital signatures)
 */

// Helper: Convert ArrayBuffer to Hex String
function arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Convert existing AES-GCM master key into an HMAC-SHA256 key for signing
async function getHmacKeyFromMasterKey(masterKey) {
    if (!masterKey) throw new Error("Master key is required for ownership proof");

    // Export the master AES key to raw bytes
    const exportedJwk = await window.crypto.subtle.exportKey('jwk', masterKey);

    // Import the raw bytes as an HMAC signing key
    return await window.crypto.subtle.importKey(
        'jwk',
        { ...exportedJwk, alg: 'HS256', key_ops: ['sign', 'verify'] },
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Generates an ownership proof payload and HMAC-SHA256 signature for a given file
 * @param {ArrayBuffer} fileBuffer - The original raw photo array buffer
 * @param {string} userEmail - The logged-in user's email/ID
 * @param {CryptoKey} masterKey - The user's E2E encryption master key
 * @returns {Promise<{payload: object, signature: string}>}
 */
export async function generateOwnershipProof(fileBuffer, userEmail, masterKey) {
    // 1. Calculate SHA-256 hash of the entire file buffer
    const fileHashBuffer = await window.crypto.subtle.digest('SHA-256', fileBuffer);
    const fileHashStr = arrayBufferToHex(fileHashBuffer);

    // 2. Construct the proof payload
    const payload = {
        fileHash: fileHashStr,
        owner: userEmail,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };

    // 3. Derive HMAC key from master key
    let hmacKey;
    try {
        // Alternative method: export as raw, import as raw (more robust than rewriting jwk properties)
        const rawKey = await window.crypto.subtle.exportKey('raw', masterKey);
        hmacKey = await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify']
        );
    } catch (err) {
        console.error("Failed to derive HMAC key:", err);
        throw new Error("HMAC key derivation failed");
    }

    // 4. Sign the JSON payload using HMAC-SHA256
    const payloadStr = JSON.stringify(payload);
    const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC',
        hmacKey,
        new TextEncoder().encode(payloadStr)
    );

    // Return payload and signature Hex string
    return {
        payload,
        signature: arrayBufferToHex(signatureBuffer)
    };
}

/**
 * Verifies a given ownership proof signature
 */
export async function verifyOwnershipProof(proof, masterKey) {
    try {
        const { payload, signature } = proof;
        const rawKey = await window.crypto.subtle.exportKey('raw', masterKey);
        const hmacKey = await window.crypto.subtle.importKey(
            'raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
        );

        // Convert hex signature back to Uint8Array
        const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        const isValid = await window.crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureBytes,
            new TextEncoder().encode(JSON.stringify(payload))
        );

        return isValid;
    } catch (e) {
        return false;
    }
}

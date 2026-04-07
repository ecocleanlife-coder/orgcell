/**
 * In-memory TTL nonce cache for replay attack prevention.
 * Replaces DB-based nonce tracking for federation JWT validation.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000 + 30 * 1000; // 5 min 30 sec (JWT 5m + 30s buffer)

class NonceCache {
    constructor() {
        this.cache = new Map(); // Map<nonce, expiresAt(ms)>
        this.startCleanup();
    }

    /**
     * Add nonce to cache.
     * @param {string} nonce - The nonce to add
     * @returns {boolean} true if nonce already exists (replay attack), false if new
     */
    add(nonce) {
        const now = Date.now();
        this._cleanup();

        // If nonce exists and hasn't expired, it's a replay
        if (this.cache.has(nonce)) {
            const expiresAt = this.cache.get(nonce);
            if (expiresAt > now) {
                return true; // Replay detected
            }
        }

        // Add or update nonce with TTL
        this.cache.set(nonce, now + DEFAULT_TTL_MS);
        return false; // New nonce, not a replay
    }

    /**
     * Check if nonce exists and is not expired.
     * @param {string} nonce - The nonce to check
     * @returns {boolean}
     */
    has(nonce) {
        const now = Date.now();
        const expiresAt = this.cache.get(nonce);
        if (!expiresAt) return false;
        return expiresAt > now;
    }

    /**
     * Delete expired entries.
     * @private
     */
    _cleanup() {
        const now = Date.now();
        for (const [nonce, expiresAt] of this.cache.entries()) {
            if (expiresAt <= now) {
                this.cache.delete(nonce);
            }
        }
    }

    /**
     * Start automatic cleanup interval (60 seconds).
     * Uses .unref() so it doesn't block process exit.
     * @private
     */
    startCleanup() {
        const interval = setInterval(() => {
            this._cleanup();
        }, 60 * 1000); // Every 60 seconds
        interval.unref(); // Don't block process exit
    }

    /**
     * Clear all cached nonces (for testing).
     */
    clear() {
        this.cache.clear();
    }
}

// Singleton instance
const instance = new NonceCache();

module.exports = instance;

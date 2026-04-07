/**
 * In-memory person metadata cache for resolveNode/resolveBatch.
 * Reduces database queries for frequently accessed person data.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

class MetaCache {
    constructor() {
        this.cache = new Map(); // Map<key, {data, expiresAt}>
        this.startCleanup();
    }

    /**
     * Get cached data if not expired.
     * @param {string} key - Cache key (e.g., "person:${siteId}:${nodeId}")
     * @returns {any|null} Cached data or null if expired/missing
     */
    get(key) {
        const now = Date.now();
        const entry = this.cache.get(key);

        if (!entry) return null;
        if (entry.expiresAt <= now) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cached data with optional TTL.
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} [ttlMs] - TTL in milliseconds (default: DEFAULT_TTL_MS)
     */
    set(key, data, ttlMs) {
        const ttl = ttlMs !== undefined ? ttlMs : DEFAULT_TTL_MS;
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
        });
    }

    /**
     * Invalidate a single cache entry.
     * @param {string} key - Cache key to remove
     */
    invalidate(key) {
        this.cache.delete(key);
    }

    /**
     * Invalidate all keys matching a prefix pattern.
     * @param {string} prefix - Key prefix (e.g., "person:1:")
     */
    invalidatePattern(prefix) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Delete expired entries.
     * @private
     */
    _cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Start automatic cleanup interval (2 minutes).
     * Uses .unref() so it doesn't block process exit.
     * @private
     */
    startCleanup() {
        const interval = setInterval(() => {
            this._cleanup();
        }, 2 * 60 * 1000); // Every 2 minutes
        interval.unref(); // Don't block process exit
    }

    /**
     * Clear all cached entries (for testing).
     */
    clear() {
        this.cache.clear();
    }
}

// Singleton instance
const instance = new MetaCache();

module.exports = instance;

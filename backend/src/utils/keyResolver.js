/**
 * PKI key resolver abstraction for federation.
 * Supports multiple strategies: dbStrategy (current) and hubStrategy (stub for future migration).
 */

const db = require('../config/db');
const {
    generateKeyPair,
    encryptPrivateKey,
    decryptPrivateKey,
} = require('./federationJWT');

/**
 * Database strategy: store/retrieve keys from domain_public_keys table.
 */
const dbStrategy = {
    async getPublicKey({ siteId }) {
        const { rows } = await db.query(
            'SELECT public_key FROM domain_public_keys WHERE site_id = $1',
            [siteId]
        );
        return rows[0]?.public_key || null;
    },

    async getKeyPair({ siteId }) {
        const { rows } = await db.query(
            'SELECT public_key, private_key_encrypted FROM domain_public_keys WHERE site_id = $1',
            [siteId]
        );
        if (!rows[0]) return null;
        return {
            publicKey: rows[0].public_key,
            privateKey: decryptPrivateKey(rows[0].private_key_encrypted),
        };
    },

    async getOrCreate({ siteId, domain }) {
        // Check existing
        const { rows } = await db.query(
            'SELECT public_key, private_key_encrypted FROM domain_public_keys WHERE site_id = $1',
            [siteId]
        );

        if (rows[0]) {
            return {
                publicKey: rows[0].public_key,
                privateKey: decryptPrivateKey(rows[0].private_key_encrypted),
            };
        }

        // Generate new keypair
        const { publicKey, privateKey } = generateKeyPair();
        const privateKeyEnc = encryptPrivateKey(privateKey);

        await db.query(
            `INSERT INTO domain_public_keys (domain, site_id, public_key, private_key_encrypted)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (domain) DO UPDATE SET public_key = $3, private_key_encrypted = $4`,
            [domain, siteId, publicKey, privateKeyEnc]
        );

        return { publicKey, privateKey };
    },

    async storeKeys({ domain, siteId, publicKey, privateKeyEncrypted }) {
        await db.query(
            `INSERT INTO domain_public_keys (domain, site_id, public_key, private_key_encrypted)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (domain) DO UPDATE SET public_key = $3, private_key_encrypted = $4`,
            [domain, siteId, publicKey, privateKeyEncrypted]
        );
    },
};

/**
 * Hub strategy: stub for future federation hub migration.
 */
const hubStrategy = {
    async getPublicKey() {
        throw new Error('Hub strategy not yet implemented');
    },

    async getKeyPair() {
        throw new Error('Hub strategy not yet implemented');
    },

    async getOrCreate() {
        throw new Error('Hub strategy not yet implemented');
    },

    async storeKeys() {
        throw new Error('Hub strategy not yet implemented');
    },
};

/**
 * KeyResolver class with pluggable strategy pattern.
 */
class KeyResolver {
    constructor() {
        this.strategy = dbStrategy;
    }

    /**
     * Switch to a different key resolution strategy.
     * @param {string} name - Strategy name: 'db' or 'hub'
     */
    setStrategy(name) {
        if (name === 'db') {
            this.strategy = dbStrategy;
        } else if (name === 'hub') {
            this.strategy = hubStrategy;
        } else {
            throw new Error(`Unknown strategy: ${name}`);
        }
    }

    /**
     * Get public key for a site.
     * @param {{siteId}} options
     * @returns {Promise<string|null>}
     */
    async getPublicKey(options) {
        return this.strategy.getPublicKey(options);
    }

    /**
     * Get both public and private keys for a site.
     * @param {{siteId}} options
     * @returns {Promise<{publicKey, privateKey}|null>}
     */
    async getKeyPair(options) {
        return this.strategy.getKeyPair(options);
    }

    /**
     * Get or create keypair for a site.
     * @param {{siteId, domain}} options
     * @returns {Promise<{publicKey, privateKey}>}
     */
    async getOrCreate(options) {
        return this.strategy.getOrCreate(options);
    }

    /**
     * Store keys for a site.
     * @param {{domain, siteId, publicKey, privateKeyEncrypted}} options
     */
    async storeKeys(options) {
        return this.strategy.storeKeys(options);
    }
}

// Singleton instance
const instance = new KeyResolver();

module.exports = instance;

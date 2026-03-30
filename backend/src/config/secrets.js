const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const SECRET_NAME = 'orgcell/credentials';
const REGION = 'us-east-2';

let cachedSecrets = null;

async function getSecrets() {
    if (cachedSecrets) {
        return cachedSecrets;
    }

    // Local dev: fallback to .env
    if (process.env.NODE_ENV !== 'production') {
        cachedSecrets = {
            SMTP_USER: process.env.SMTP_USER || '',
            SMTP_PASS: process.env.SMTP_PASS || '',
            RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        };
        return cachedSecrets;
    }

    try {
        const client = new SecretsManagerClient({ region: REGION });
        const response = await client.send(
            new GetSecretValueCommand({ SecretId: SECRET_NAME })
        );
        cachedSecrets = JSON.parse(response.SecretString);
        console.log('[secrets] Loaded credentials from AWS Secrets Manager');
        return cachedSecrets;
    } catch (error) {
        console.error('[secrets] Failed to load from Secrets Manager:', error.message);
        // Fallback to env vars if Secrets Manager fails
        cachedSecrets = {
            SMTP_USER: process.env.SMTP_USER || '',
            SMTP_PASS: process.env.SMTP_PASS || '',
            RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        };
        return cachedSecrets;
    }
}

module.exports = { getSecrets };

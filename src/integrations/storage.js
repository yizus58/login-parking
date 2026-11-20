'use strict';

const { randomBytes } = require('crypto');
const { DeleteObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getConfig } = require('../config/env');

const REQUIRED = { accountId: 'R2_ACCOUNT_ID', accessKeyId: 'R2_BUCKET_ACCESS_KEY', secretAccessKey: 'R2_BUCKET_SECRET_KEY', bucket: 'R2_BUCKET_NAME' };

/**
 * Cloudflare R2 (S3 compatible) storage for report attachments. The client is created on
 * first use, so the API runs without storage settings; only the report needs them.
 */
class Storage {
    constructor(settings = () => getConfig().storage, createClient = (options) => new S3Client(options)) {
        this.settings = settings;
        this.createClient = createClient;
        this.client = null;
    }

    getClient() {
        if (this.client) return this.client;
        const s = this.settings();
        const missing = Object.entries(REQUIRED).filter(([key]) => !s[key]).map(([, name]) => name);
        if (missing.length > 0) throw new Error(`Missing storage settings: ${missing.join(', ')}`);
        this.client = this.createClient({
            region: s.region,
            endpoint: `https://${s.accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
            forcePathStyle: true,
        });
        return this.client;
    }

    /** Uploads under a new random key and returns the key. */
    async upload(buffer, contentType) {
        if (!buffer || buffer.length === 0) throw new Error('Cannot upload an empty file');
        const key = randomBytes(16).toString('hex');
        await this.getClient().send(new PutObjectCommand({ Bucket: this.settings().bucket, Key: key, Body: buffer, ContentType: contentType }));
        return key;
    }

    async remove(key) {
        await this.getClient().send(new DeleteObjectCommand({ Bucket: this.settings().bucket, Key: key }));
    }
}

module.exports = { Storage };

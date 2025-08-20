const {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client} = require("@aws-sdk/client-s3");
const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");
const crypto = require('crypto');
require('dotenv').config();

const r2 = new S3Client({
    region: process.env.R2_BUCKET_REGION,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.R2_BUCKET_SECRET_KEY
    },
    forcePathStyle: true,
});

async function uploadFile(buffer, contentType, nameFile) {
    let fileName = !nameFile ? crypto.randomBytes(16).toString('hex') : nameFile;
    try {
        const commandFind = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
        });

        await r2.send(commandFind);

        console.log(`File "${fileName}" already exists in the bucket.`);
        return {
            url: `${process.env.R2_BUCKET_PATH}/${fileName}`,
            key: fileName,
            exists: true
        };

    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`File "${fileName}" does not exist. Proceeding with upload.`);
        } else {
            console.warn(`Error checking file existence: ${error.message}`);
        }
    }

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType
    });

    await r2.send(command);

    const url = `${process.env.R2_BUCKET_PATH}/${fileName}`;

    return {url: url, key: fileName};
}

const deleteFile = async (filename) => {
    try {
        if (!process.env.R2_BUCKET_NAME) {
            throw new Error('R2_BUCKET_NAME environment variable is not set');
        }

        if (!filename) {
            throw new Error('Filename is required for deletion');
        }

        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
        });

        return await r2.send(command);
    } catch (error) {
        console.error('Error deleting file from Cloudflare R2:', error);
        throw error;
    }
};

module.exports = {uploadFile, deleteFile}
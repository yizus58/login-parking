const {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client} = require("@aws-sdk/client-s3");
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

async function uploadFile(buffer, contentType, fileName) {

    await getFile(fileName);

    try {
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType
        });

        await r2.send(command);

        return {Key: fileName};
    } catch (error) {
        console.error(`Error uploading file "${fileName}": ${error.message}`);
        throw error;
    }
}

async function getFile (filename) {
    try {
        const commandFind = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
        });

        await r2.send(commandFind);
        return {
            key: filename,
            exists: true
        };

    } catch (error) {
        if (error.name !== 'NoSuchKey') {
            console.warn(`Error checking file existence: ${error.message}`);
            throw error;
        }
    }
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
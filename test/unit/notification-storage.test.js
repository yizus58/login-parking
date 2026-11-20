'use strict';

const { NotificationService } = require('../../src/services/notification.service');
const { Storage } = require('../../src/integrations/storage');

describe('NotificationService', () => {
    const email = { userId: 1, recipients: ['a@example.com'], subject: 'S', html: 'H' };

    it('queues on RabbitMQ by default (MAIL_TRANSPORT=rabbitmq)', async () => {
        const publisher = { publish: jest.fn(), close: jest.fn() };
        const mailApi = { send: jest.fn() };
        await new NotificationService({ transport: () => 'rabbitmq', publisher, mailApi }).sendEmail(email);
        expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'email_notification', data: email }));
        expect(mailApi.send).not.toHaveBeenCalled();
    });

    it('calls api-mail over HTTP when MAIL_TRANSPORT=http (the env string was compared to a number before)', async () => {
        const publisher = { publish: jest.fn(), close: jest.fn() };
        const mailApi = { send: jest.fn() };
        await new NotificationService({ transport: () => 'http', publisher, mailApi }).sendEmail(email);
        expect(mailApi.send).toHaveBeenCalledWith(email);
        expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('propagates failures and closes the publisher', async () => {
        const publisher = { publish: jest.fn().mockRejectedValue(new Error('down')), close: jest.fn() };
        const service = new NotificationService({ transport: () => 'rabbitmq', publisher, mailApi: {} });
        await expect(service.sendEmail(email)).rejects.toThrow('down');
        await service.close();
        expect(publisher.close).toHaveBeenCalled();
    });
});

describe('Storage (Cloudflare R2)', () => {
    const settings = (overrides = {}) => () => ({ accountId: 'acc', accessKeyId: 'id', secretAccessKey: 'secret', bucket: 'bucket', region: 'auto', ...overrides });

    it('creates the client on first use with the R2 endpoint, and uploads under a random key without a prior GET', async () => {
        const send = jest.fn().mockResolvedValue({});
        const createClient = jest.fn(() => ({ send }));
        const storage = new Storage(settings(), createClient);
        expect(createClient).not.toHaveBeenCalled();

        const key = await storage.upload(Buffer.from('xlsx'), 'application/x');
        const key2 = await storage.upload(Buffer.from('xlsx'), 'application/x');
        expect(key).toMatch(/^[a-f0-9]{32}$/);
        expect(key2).not.toBe(key);
        expect(createClient).toHaveBeenCalledTimes(1);
        expect(createClient.mock.calls[0][0]).toMatchObject({ endpoint: 'https://acc.r2.cloudflarestorage.com', region: 'auto', forcePathStyle: true });
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][0].constructor.name).toBe('PutObjectCommand');
        expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'bucket', Key: key, ContentType: 'application/x' });
    });

    it('deletes by key', async () => {
        const send = jest.fn().mockResolvedValue({});
        await new Storage(settings(), () => ({ send })).remove('k1');
        expect(send.mock.calls[0][0].constructor.name).toBe('DeleteObjectCommand');
        expect(send.mock.calls[0][0].input).toEqual({ Bucket: 'bucket', Key: 'k1' });
    });

    it('names the missing settings and refuses empty files', async () => {
        const storage = new Storage(settings({ accountId: '', bucket: '' }), jest.fn());
        await expect(storage.upload(Buffer.from('x'), 't')).rejects.toThrow('Missing storage settings: R2_ACCOUNT_ID, R2_BUCKET_NAME');
        await expect(new Storage(settings(), jest.fn()).upload(Buffer.alloc(0), 't')).rejects.toThrow('Cannot upload an empty file');
    });
});

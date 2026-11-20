'use strict';

const { MailApiClient } = require('../../src/integrations/mail-api.client');

const settings = (overrides = {}) => () => ({ apiUrl: 'https://mail.example', apiKey: 'test-key', timeoutMs: 1000, ...overrides });
const reply = (status, body = { result: true }) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

describe('MailApiClient (api-mail over HTTP)', () => {
    it('POSTs to /mail/send with the x-api-key header and recipients as an array', async () => {
        const fetch = jest.fn().mockResolvedValue(reply(201, { result: true, message: 'sent' }));
        const client = new MailApiClient(settings(), fetch);
        const result = await client.send({
            recipients: ['a@example.com'],
            subject: 'S',
            html: '<p>x</p>',
            attachments: [{ name_file: 'r.xlsx', s3_name: 'k1' }],
        });
        expect(result).toEqual({ result: true, message: 'sent' });
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://mail.example/mail/send');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'x-api-key': 'test-key' });
        expect(JSON.parse(options.body)).toEqual({
            recipients: ['a@example.com'],
            subject: 'S',
            html: '<p>x</p>',
            attachments: [{ name_file: 'r.xlsx', s3_name: 'k1' }],
        });
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('omits empty attachments', async () => {
        const fetch = jest.fn().mockResolvedValue(reply(201));
        await new MailApiClient(settings(), fetch).send({ recipients: ['a@example.com'], subject: 'S', html: 'h', attachments: [] });
        expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('attachments');
    });

    it('fails on a non-2xx answer (e.g. a wrong key)', async () => {
        const fetch = jest.fn().mockResolvedValue(reply(401, { message: 'Invalid API key' }));
        await expect(new MailApiClient(settings(), fetch).send({ recipients: [], subject: '', html: '' })).rejects.toThrow('api-mail answered 401');
    });

    it('requires the URL and the key', async () => {
        const fetch = jest.fn();
        await expect(new MailApiClient(settings({ apiKey: '' }), fetch).send({})).rejects.toThrow('MAIL_API_URL and MAIL_API_KEY are required');
        await expect(new MailApiClient(settings({ apiUrl: '' }), fetch).send({})).rejects.toThrow(/required/);
        expect(fetch).not.toHaveBeenCalled();
    });
});

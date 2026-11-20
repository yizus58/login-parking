'use strict';

const { getConfig } = require('../config/env');

/**
 * POST {MAIL_API_URL}/mail/send on api-mail, authenticated with the shared MAIL_API_KEY in
 * the x-api-key header (api-mail rejects requests without it).
 */
class MailApiClient {
    constructor(settings = () => getConfig().mail, fetchImpl = (...args) => fetch(...args)) {
        this.settings = settings;
        this.fetch = fetchImpl;
    }

    async send({ recipients, subject, html, attachments }) {
        const { apiUrl, apiKey, timeoutMs } = this.settings();
        if (!apiUrl || !apiKey) {
            throw new Error('MAIL_API_URL and MAIL_API_KEY are required to send e-mail over HTTP');
        }
        const response = await this.fetch(`${apiUrl}/mail/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({
                recipients,
                subject,
                html,
                ...(attachments && attachments.length > 0 ? { attachments } : {}),
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`api-mail answered ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
        }
        return response.json().catch(() => ({}));
    }
}

module.exports = { MailApiClient };

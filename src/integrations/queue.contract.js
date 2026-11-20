'use strict';

/**
 * RabbitMQ contract shared with api-mail (the consumer) and the other producers. RabbitMQ
 * rejects a queue re-declared with different arguments, so these must match api-mail.
 */
const DEFAULT_EMAIL_QUEUE = 'email_queue';
const EMAIL_RETRY_QUEUE = 'email_retry_queue';
const RETRY_DELAY_MS = 60000;
const EMAIL_NOTIFICATION_TYPE = 'email_notification';
const finalDeadLetterQueue = (queue) => `${queue}.dlq.final`;

/**
 * { type: 'email_notification', data: { userId, recipients, subject, html, attachments? }, timestamp }
 * attachments: [{ name_file, s3_name }] (api-mail also accepts a single object).
 */
function buildEmailMessage({ userId, recipients, subject, html, attachments }, now = new Date()) {
    return {
        type: EMAIL_NOTIFICATION_TYPE,
        data: {
            userId,
            recipients,
            subject,
            html,
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
        },
        timestamp: now.toISOString(),
    };
}

module.exports = {
    DEFAULT_EMAIL_QUEUE,
    EMAIL_RETRY_QUEUE,
    RETRY_DELAY_MS,
    EMAIL_NOTIFICATION_TYPE,
    finalDeadLetterQueue,
    buildEmailMessage,
};

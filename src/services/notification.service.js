'use strict';

const { getConfig } = require('../config/env');
const { MailApiClient } = require('../integrations/mail-api.client');
const { RabbitMQPublisher } = require('../integrations/rabbitmq.publisher');
const { buildEmailMessage } = require('../integrations/queue.contract');

/**
 * Sends an e-mail through api-mail: queued on RabbitMQ (MAIL_TRANSPORT=rabbitmq, default) or
 * directly over HTTP (MAIL_TRANSPORT=http, with the x-api-key header).
 */
class NotificationService {
    constructor({ transport = () => getConfig().mail.transport, publisher = new RabbitMQPublisher(), mailApi = new MailApiClient() } = {}) {
        this.transport = transport;
        this.publisher = publisher;
        this.mailApi = mailApi;
    }

    async sendEmail(email) {
        if (this.transport() === 'http') {
            await this.mailApi.send(email);
        } else {
            await this.publisher.publish(buildEmailMessage(email));
        }
    }

    async close() {
        await this.publisher.close();
    }
}

module.exports = { NotificationService };

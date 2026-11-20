'use strict';

const amqp = require('amqplib');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');
const { EMAIL_RETRY_QUEUE, RETRY_DELAY_MS, finalDeadLetterQueue } = require('./queue.contract');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Publishes to the e-mail queue consumed by api-mail. Connects on first use (the API starts
 * without RabbitMQ), declares the same queues as api-mail and retries a failed publish with
 * exponential backoff, reconnecting each time.
 */
class RabbitMQPublisher {
    constructor(settings = () => getConfig().rabbitmq, client = amqp) {
        this.settings = settings;
        this.client = client;
        this.connection = null;
        this.channel = null;
    }

    async publish(message) {
        const { queue, publishRetries, retryDelayMs } = this.settings();
        for (let attempt = 0; ; attempt++) {
            try {
                const channel = await this.getChannel();
                channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                    persistent: true,
                    contentType: 'application/json',
                });
                return;
            } catch (error) {
                await this.close();
                if (attempt >= publishRetries) throw error;
                const delay = retryDelayMs * 2 ** attempt;
                logger.warn(`RabbitMQ publish failed (${error.message}); retry ${attempt + 1}/${publishRetries} in ${delay} ms`);
                await sleep(delay);
            }
        }
    }

    async getChannel() {
        if (this.channel) return this.channel;
        const { url, queue } = this.settings();
        const connection = await this.client.connect(url);
        connection.on('error', (error) => logger.error(`RabbitMQ connection error: ${error.message}`));
        connection.on('close', () => {
            this.connection = null;
            this.channel = null;
        });
        const channel = await connection.createChannel();
        await channel.assertQueue(finalDeadLetterQueue(queue), { durable: true });
        await channel.assertQueue(EMAIL_RETRY_QUEUE, {
            durable: true,
            arguments: {
                'x-message-ttl': RETRY_DELAY_MS,
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': queue,
            },
        });
        await channel.assertQueue(queue, {
            durable: true,
            arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': queue },
        });
        this.connection = connection;
        this.channel = channel;
        return channel;
    }

    async close() {
        const { channel, connection } = this;
        this.channel = null;
        this.connection = null;
        await channel?.close().catch(() => undefined);
        await connection?.close().catch(() => undefined);
    }
}

module.exports = { RabbitMQPublisher };

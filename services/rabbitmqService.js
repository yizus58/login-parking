const { backOff } = require('../config/backoff');
const amqp = require('amqplib');
const logger = require('../utils/logger');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.queue = 'email_queue';
        this.connectWithBackoff = backOff(1)(30)(
            this.connect.bind(this),
            (error) => logger.error('Failed to connect after max retries:', error),
            () => logger.info('Connected to RabbitMQ successfully'),
            (error) => logger.warn('Connection attempt failed, retrying...', error)
        );

        this.publishWithBackoff = backOff(1)(15)(
            this._publishMessageInternal.bind(this),
            (error, message) => {
                logger.error('Failed to publish message after max retries:', {error: error, message: message });
            },
            (result, message) => {
                logger.info('Message published successfully with backoff');
            },
            (error, message) => {
                logger.warn('Publish attempt failed, retrying...', error.message);
            }
        );
    }

    async _publishMessageInternal(message) {
        await this.ensureConnection();

        if (!this.channel) {
            throw new Error('No channel available for publishing');
        }
        await this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(message)), {
            persistent: true
        });

        return { success: true, message: 'Message published' };
    }

    async publishMessageBackoff(message) {
        try {
            return await this.publishWithBackoff(message);
        } catch (error) {
            logger.error('Error in publishMessageBackoff:', error);
            throw error;
        }
    }

    isChannelOpen() {
        return this.channel && !this.channel.connection.destroyed;
    }

    isConnectionOpen() {
        return this.connection && !this.connection.connection.destroyed;
    }

    async connect() {
        try {
            if (this.isConnectionOpen() && this.isChannelOpen()) {
                logger.info('✅ Using existing RabbitMQ connection and channel');
                await this.setupQueues(this.queue);
                return;
            }

            if (!this.isConnectionOpen()) {
                const rabbitmqUrl = process.env.RABBITMQ_URL;
                logger.info(`Attempting to connect to RabbitMQ with URL: ${rabbitmqUrl}`);
                this.connection = await amqp.connect(rabbitmqUrl);

                this.connection.on('error', (err) => {
                    logger.error('RabbitMQ connection error:', err);
                    this.connection = null;
                    this.channel = null;
                });

                this.connection.on('close', () => {
                    logger.warn('RabbitMQ connection closed');
                    this.connection = null;
                    this.channel = null;
                })
            }

            if (!this.isChannelOpen()) {
                logger.info('🔄 Creating new RabbitMQ channel...');
                this.channel = await this.connection.createChannel();

                this.channel.on('error', (err) => {
                    logger.error('RabbitMQ channel error:', err);
                    this.channel = null;
                });

                this.channel.on('close', () => {
                    logger.warn('RabbitMQ channel closed');
                    this.channel = null;
                });

                logger.info('✅ Connected to RabbitMQ');
            }

            await this.setupQueues(this.queue);
        } catch (error) {
            logger.error('Error connecting to RabbitMQ:', error);
            this.connection = null;
            this.channel = null;
            throw error;
        }
    }

    async ensureConnection() {
        if (!this.connection || this.connection.connection.destroyed) {
            await this.connectWithBackoff();
        }
    }

    async setupQueues() {

        await this.channel.assertQueue(this.queue, { durable: true });

    }

    async publishMessage(message) {
        try {
            await this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(message)), {
                persistent: true
            });
        } catch (error) {
            logger.error('Error publishing message:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.close();
            logger.info('RabbitMQ connection closed');
        }


    }
}

module.exports = new RabbitMQService();
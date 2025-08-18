const amqp = require('amqplib');
const logger = require('../utils/logger');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
    }

    async connect(queue) {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL;
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            logger.info('Connected to RabbitMQ');

            await this.setupQueues(queue);

        } catch (error) {
            logger.error('Error connecting to RabbitMQ:', error);
            throw error;
        }
    }

    async setupQueues(queue = 'email_queue') {

        await this.channel.assertQueue(queue, { durable: true });

    }

    async publishMessage(queue, message) {
        try {
            await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                persistent: true
            });
            logger.info(`Message sent to queue ${queue}:`, message);
        } catch (error) {
            logger.error('Error publishing message:', error);
            throw error;
        }
    }

    async consumeMessages(queue, callback) {
        try {
            await this.channel.consume(queue, async (msg) => {
                if (!msg) {
                    console.log('No more messages to consume');
                }
                const content = JSON.parse(msg.content.toString());
                console.log(`Received message from queue ${queue}:`, content);
                await callback(content);
                this.channel.ack(msg);
            });
            logger.info(`Started consuming messages from queue: ${queue}`);
        } catch (error) {
            logger.error('Error consuming messages:', error);
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
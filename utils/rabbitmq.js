const RabbitMQService = require("../services/rabbitmqService");
const logger = require("./logger");

async function RabbitMQPublisher(testMessage) {
    try {
        await RabbitMQService.connect();

        if (!testMessage) {
            testMessage = {
                type: 'email_notification',
                data: {
                    recipients : "admin@mail.com",
                    subject: "TEST ENVIO DE CORREO ",
                    html: "Esta es la primera parte de la prueba #"+ new Date().toISOString(),
                }
            };
        }

        await RabbitMQService.publishMessage(testMessage);
        logger.info('Message published successfully:', testMessage);

    } catch (error) {
        console.error('Error in RabbitMQ publisher:', error);
        throw error;
    }
}

async function RabbitMQPublisherBackoff(params) {
    try {
        const base = params?.data ? params.data : (params || {});

        if (!base.recipients || !base.subject || !base.html) {
            logger.error('RabbitMQPublisherBackoff: parámetros inválidos para publicar mensaje', { params });
            return;
        }
        const id = Math.floor(Math.random() * 1000000);

        const message = {
            type: 'email_notification',
            data: {
                userId: base.userId ?? id,
                recipients: base.recipients,
                subject: base.subject,
                html: base.html,
                ...(base.attachments && { attachments: base.attachments })
            },
            timestamp: new Date().toISOString()
        };

        await RabbitMQService.publishMessageBackoff(message);
    } catch (error) {
        logger.error('Failed to send message even with backoff:', error);
    }
}

module.exports = { RabbitMQPublisher, RabbitMQPublisherBackoff };
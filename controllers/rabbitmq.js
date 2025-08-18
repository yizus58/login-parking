const RabbitMQService = require("../services/rabbitmqService");

async function RabbitMQPublisher(testMessage) {
    try {
        await RabbitMQService.connect();

        if (!testMessage) {
            testMessage = {
                type: 'test',
                data: {
                    message: 'Hello from RabbitMQ test',
                    timestamp: new Date().toISOString()
                }
            };
        }

        await RabbitMQService.publishMessage('email_queue', testMessage);
        console.log('Message published successfully:', testMessage);

    } catch (error) {
        console.error('Error in RabbitMQ publisher:', error);
        throw error;
    }
}

async function RabbitMQSubscriber() {
    try {
        await RabbitMQService.connect();

        console.log('Starting RabbitMQ subscriber...');
        await RabbitMQService.consumeMessages('email_queue', (message) => {
            console.log('Received message:', message);
        });

        // Keep the subscriber running
        console.log('Subscriber is running. Press Ctrl+C to stop.');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down subscriber...');
            await RabbitMQService.close();
            process.exit(0);
        });

        // Keep the process alive
        await new Promise(() => {}); // This will keep the process running indefinitely

    } catch (error) {
        console.error('Error in RabbitMQ subscriber:', error);
        await RabbitMQService.close();
        throw error;
    }
}

// Test function that runs publisher first, then subscriber
async function testRabbitMQ() {
    try {
        console.log('Testing RabbitMQ Publisher...');
        await RabbitMQPublisher();
        console.log('Publisher test completed successfully.');

        // Wait a moment before starting subscriber
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Starting RabbitMQ Subscriber...');
        await RabbitMQSubscriber();

    } catch (error) {
        console.error('RabbitMQ test failed:', error);
        process.exit(1);
    }
}

// Alternative: Test them separately
async function testPublisherOnly() {
    try {
        console.log('Testing RabbitMQ Publisher only...');
        await RabbitMQPublisher();
        console.log('Publisher test completed successfully.');
        await RabbitMQService.close();
        process.exit(0);
    } catch (error) {
        console.error('Publisher test failed:', error);
        await RabbitMQService.close();
        process.exit(1);
    }
}

async function testSubscriberOnly() {
    try {
        console.log('Testing RabbitMQ Subscriber only...');
        await RabbitMQSubscriber();
        process.exit(0);
    } catch (error) {
        console.error('Subscriber test failed:', error);
        await RabbitMQService.close();
        process.exit(1);
    }
}

// Choose which test to run:
// testRabbitMQ();        // Test both (publisher first, then subscriber)
//testPublisherOnly();   // Test only publisher
 testSubscriberOnly();  // Test only subscriber

module.exports = { RabbitMQPublisher, RabbitMQSubscriber };
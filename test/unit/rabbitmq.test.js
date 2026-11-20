'use strict';

const { RabbitMQPublisher } = require('../../src/integrations/rabbitmq.publisher');
const { buildEmailMessage, finalDeadLetterQueue } = require('../../src/integrations/queue.contract');

function fakeAmqp({ failConnects = 0, failSends = 0 } = {}) {
    const state = { connects: 0, asserts: [], sent: [], closed: 0 };
    let sendFailures = failSends;
    const client = {
        connect: jest.fn(async (url) => {
            state.connects++;
            state.url = url;
            if (state.connects <= failConnects) throw new Error('ECONNREFUSED');
            return {
                on: jest.fn(),
                close: jest.fn(async () => state.closed++),
                createChannel: async () => ({
                    assertQueue: async (name, options) => state.asserts.push([name, options]),
                    sendToQueue: (queue, buffer, options) => {
                        if (sendFailures-- > 0) throw new Error('channel closed');
                        state.sent.push({ queue, message: JSON.parse(buffer.toString()), options });
                        return true;
                    },
                    close: async () => undefined,
                }),
            };
        }),
    };
    return { client, state };
}

const settings = (overrides = {}) => () => ({ url: 'amqp://broker', queue: 'email_queue', publishRetries: 2, retryDelayMs: 1, ...overrides });

describe('RabbitMQ publisher', () => {
    it('declares the queues exactly as api-mail does (no PRECONDITION_FAILED)', async () => {
        const { client, state } = fakeAmqp();
        await new RabbitMQPublisher(settings(), client).publish({ type: 'email_notification' });
        expect(state.asserts).toEqual([
            ['email_queue.dlq.final', { durable: true }],
            ['email_retry_queue', { durable: true, arguments: { 'x-message-ttl': 60000, 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': 'email_queue' } }],
            ['email_queue', { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': 'email_queue' } }],
        ]);
    });

    it('publishes persistent JSON messages and reuses the channel', async () => {
        const { client, state } = fakeAmqp();
        const publisher = new RabbitMQPublisher(settings(), client);
        await publisher.publish({ n: 1 });
        await publisher.publish({ n: 2 });
        expect(state.connects).toBe(1);
        expect(state.sent.map((s) => s.message)).toEqual([{ n: 1 }, { n: 2 }]);
        expect(state.sent[0].options).toEqual({ persistent: true, contentType: 'application/json' });
        expect(state.sent[0].queue).toBe('email_queue');
    });

    it('reconnects and retries a bounded number of times', async () => {
        const { client, state } = fakeAmqp({ failConnects: 2 });
        await new RabbitMQPublisher(settings(), client).publish({ n: 1 });
        expect(state.connects).toBe(3);
        expect(state.sent).toHaveLength(1);

        const down = fakeAmqp({ failConnects: 99 });
        await expect(new RabbitMQPublisher(settings(), down.client).publish({})).rejects.toThrow('ECONNREFUSED');
        expect(down.state.connects).toBe(3);
    });

    it('drops a broken channel and publishes on a new connection', async () => {
        const { client, state } = fakeAmqp({ failSends: 1 });
        await new RabbitMQPublisher(settings(), client).publish({ n: 1 });
        expect(state.connects).toBe(2);
        expect(state.closed).toBe(1);
        expect(state.sent).toHaveLength(1);
    });

    it('honours a custom queue name', async () => {
        const { client, state } = fakeAmqp();
        await new RabbitMQPublisher(settings({ queue: 'custom' }), client).publish({});
        expect(state.asserts.map(([name]) => name)).toEqual(['custom.dlq.final', 'email_retry_queue', 'custom']);
        expect(finalDeadLetterQueue('custom')).toBe('custom.dlq.final');
    });

    it('close() is safe without a connection', async () => {
        await expect(new RabbitMQPublisher(settings(), fakeAmqp().client).close()).resolves.toBeUndefined();
    });
});

describe('e-mail message contract', () => {
    it('matches what api-mail consumes', () => {
        const now = new Date('2026-03-11T05:05:00Z');
        expect(
            buildEmailMessage({ userId: 3, recipients: ['a@example.com'], subject: 'S', html: 'H', attachments: [{ name_file: 'f.xlsx', s3_name: 'k' }] }, now),
        ).toEqual({
            type: 'email_notification',
            data: { userId: 3, recipients: ['a@example.com'], subject: 'S', html: 'H', attachments: [{ name_file: 'f.xlsx', s3_name: 'k' }] },
            timestamp: '2026-03-11T05:05:00.000Z',
        });
        expect(buildEmailMessage({ userId: 3, recipients: [], subject: 'S', html: 'H' }, now).data).not.toHaveProperty('attachments');
    });
});

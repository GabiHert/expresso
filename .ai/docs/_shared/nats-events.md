# NATS Events Pattern

Event-driven architecture using NATS JetStream across Deel services.

## Overview

NATS JetStream is used for:
- Async event publishing
- Durable message consumption
- At-least-once delivery guarantees
- Cross-service communication

## Connection Setup

```typescript
import { NatsClient } from '@deel-core/nats-lib';

const natsClient = new NatsClient({
  servers: process.env.NATS_SERVERS,
  // ...config
});

await natsClient.connect();
```

## Publishing Events

### Simple Publish
```typescript
await natsClient.publish('subject.name', {
  type: 'event_type',
  data: { ... }
});
```

### With Headers
```typescript
await natsClient.publish('subject.name', payload, {
  headers: {
    'x-correlation-id': requestId,
  }
});
```

## Consumer Pattern

### JetStream Consumer
```typescript
class MyConsumer extends BaseConsumer {
  constructor(natsClient) {
    super(natsClient, {
      stream: 'STREAM_NAME',
      consumer: 'consumer-name',
      subjects: ['subject.pattern.*'],
    });
  }

  async handleMessage(msg) {
    const data = JSON.parse(msg.data);
    // Process message
    msg.ack();
  }
}
```

### Consumer Configuration
```typescript
{
  stream: 'STREAM_NAME',
  consumer: 'consumer-name',
  subjects: ['subject.*'],
  deliverPolicy: 'all',  // or 'new', 'last'
  ackPolicy: 'explicit',
  maxDeliver: 3,
  ackWait: 30000,  // 30 seconds
}
```

## Common Subjects

### PEO Service
- `peo.contract.termination`
- `peo.payslip.generate`
- `WorkerProfile.changed`
- `WorkerProfile.sync`

### Backend
- `contract.created`
- `contract.updated`
- `invoice.generated`
- `payment.processed`

## Transactional Outbox Pattern

For guaranteed delivery with database transactions:

```typescript
// 1. Write event to outbox table in same transaction
await OutboxEvent.create({
  type: 'event_type',
  payload: { ... },
  status: 'pending',
}, { transaction });

// 2. CDC process picks up and publishes to NATS
// 3. Mark as processed after successful publish
```

## Error Handling

```typescript
async handleMessage(msg) {
  try {
    await this.processMessage(msg);
    msg.ack();
  } catch (error) {
    if (this.isRetryable(error)) {
      msg.nak();  // Will retry
    } else {
      msg.term(); // Send to DLQ
    }
  }
}
```

## Dead Letter Queue (DLQ)

Failed messages after max retries go to DLQ:
- Stream: `STREAM_NAME_DLQ`
- Subject: `dlq.original.subject`

### Replaying DLQ
```bash
npm run run-task
# Select: NATSDLQReplayTask
```

## Best Practices

1. **Idempotency**: Handle duplicate messages gracefully
2. **Ordering**: Don't rely on message order across subjects
3. **Payload Size**: Keep payloads small, use references
4. **Correlation IDs**: Track message flow across services
5. **Monitoring**: Log consumer lag and processing times

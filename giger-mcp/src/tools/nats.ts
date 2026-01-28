import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GigerClient } from '../client.js';

export function registerNatsTools(server: McpServer, client: GigerClient) {
  server.registerTool(
    'list_streams',
    {
      title: 'List NATS Streams',
      description: 'List all NATS JetStream streams in an environment.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = await client.request<unknown>(`/environments/${environment}/streams`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_stream_messages',
    {
      title: 'Get Stream Messages',
      description: 'Read messages from a NATS stream. Useful for inspecting event flow between services.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        stream: z.string().describe('Stream name'),
        limit: z.number().optional().describe('Max messages to return'),
      },
    },
    async ({ environment, stream, limit }) => {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (limit) params.limit = limit;

      const result = await client.request<unknown>(
        `/environments/${environment}/streams/${stream}/messages`,
        { params }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'publish_message',
    {
      title: 'Publish NATS Message',
      description: 'Publish a message to a NATS stream subject. Useful for triggering event handlers in services.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        stream: z.string().describe('Stream name'),
        subject: z.string().describe('NATS subject to publish to'),
        payload: z.string().describe('JSON payload string to publish'),
      },
    },
    async ({ environment, stream, subject, payload }) => {
      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        return {
          content: [{ type: 'text' as const, text: 'Error: payload must be valid JSON' }],
          isError: true,
        };
      }

      const result = await client.request<unknown>(
        `/environments/${environment}/streams/messages/publish`,
        {
          method: 'POST',
          body: { stream, subject, payload: parsedPayload },
        }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_stream_consumers',
    {
      title: 'Get Stream Consumers',
      description: 'List consumers for a NATS stream. Shows which services are subscribed to the stream.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        stream: z.string().describe('Stream name'),
      },
    },
    async ({ environment, stream }) => {
      const result = await client.request<unknown>(
        `/environments/${environment}/streams/${stream}/consumers`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GigerClient } from '../client.js';

export function registerDatabaseTools(server: McpServer, client: GigerClient) {
  server.registerTool(
    'list_environment_databases',
    {
      title: 'List Environment Databases',
      description: 'List all database services deployed in an environment.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = await client.request<unknown>(
        `/environments/${environment}/database-services`
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'reset_database',
    {
      title: 'Reset Database',
      description: 'Reset a database to its backup snapshot state. Destroys all current data and restores from the backup instance used during creation.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        dbType: z.string().describe('Database type (e.g., "postgres")'),
        dbName: z.string().describe('Database name (e.g., "deel", "employment")'),
      },
    },
    async ({ environment, dbType, dbName }) => {
      const result = await client.request<unknown>(
        `/environments/${environment}/database-services/${dbType}/${dbName}/reset`,
        { method: 'POST' }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GigerClient } from '../client.js';

export function registerDiscoveryTools(server: McpServer, client: GigerClient) {
  server.registerTool(
    'list_service_definitions',
    {
      title: 'List Service Definitions',
      description: 'List all available service definitions that can be deployed to environments. Returns service names, IDs, owners, and versions. Use the ID when creating environments.',
      inputSchema: {
        query: z.string().optional().describe('Filter by name (substring match)'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
        limit: z.number().optional().describe('Max results per page (default: 100)'),
      },
    },
    async ({ query, cursor, limit }) => {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (query) params.filterByQuery = query;
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      const result = await client.paginated<{
        id: string;
        name: string;
        version: number;
        owner: string;
        createdAt: string;
      }>('/service-definitions/', params);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_branches',
    {
      title: 'List Branches',
      description: 'List available branches for a service definition. Returns branch names and IDs needed for listing commits.',
      inputSchema: {
        serviceDefinitionId: z.string().describe('Service name (e.g., "peo", "backend", "admin")'),
        cursor: z.string().optional().describe('Pagination cursor'),
        limit: z.number().optional().describe('Max results per page'),
      },
    },
    async ({ serviceDefinitionId, cursor, limit }) => {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      const result = await client.paginated<{
        id: number;
        name: string;
        repositoryId: number;
        createdAt: string;
        updatedAt: string;
      }>(`/repositories/${serviceDefinitionId}/branches`, params);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_commits',
    {
      title: 'List Commits',
      description: 'List commits for a specific branch of a service. Returns commit SHA (used as tag when creating environments), author, message, and build status.',
      inputSchema: {
        serviceDefinitionId: z.string().describe('Service name (e.g., "peo", "backend", "admin")'),
        branch: z.string().describe('Branch name (e.g., "master", "develop")'),
        cursor: z.string().optional().describe('Pagination cursor'),
        limit: z.number().optional().describe('Max results per page'),
      },
    },
    async ({ serviceDefinitionId, branch, cursor, limit }) => {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      const result = await client.paginated<{
        sha: string;
        author: string;
        message: string;
        buildId: number | null;
        updatedAt: string;
      }>(`/repositories/${serviceDefinitionId}/branches/${branch}/commits`, params);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_available_databases',
    {
      title: 'List Available Databases',
      description: 'List all database types that can be deployed in environments (e.g., deel, employment, peo, benefits). Returns database groups with their selectable backup options.',
      inputSchema: {},
    },
    async () => {
      const result = await client.request<unknown>('/admin/api/databases/deployable-databases');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_backup_instances',
    {
      title: 'Get Backup Instances',
      description: 'List available backup instances for a database. Used to see available snapshots.',
      inputSchema: {
        dbId: z.string().describe('Database ID'),
      },
    },
    async ({ dbId }) => {
      const result = await client.request<unknown>(`/admin/api/databases/${dbId}/backup_instances`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

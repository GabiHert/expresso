import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GigerClient } from '../client.js';

const ServiceSchema = z.object({
  name: z.string().describe('Service name (e.g., "backend", "peo", "admin")'),
  branch: z.string().describe('Git branch name (e.g., "master", "develop")'),
  sha: z.string().describe('Git commit SHA to deploy (from list_commits)'),
  follow: z.boolean().optional().describe('Auto-deploy new commits on this branch (default: false)'),
  chartVersion: z.string().optional().describe('Helm chart version'),
  chartValuesOverride: z.string().optional().describe('Helm chart values override in YAML format'),
});

export function registerEnvironmentTools(server: McpServer, client: GigerClient) {
  server.registerTool(
    'create_environment',
    {
      title: 'Create Environment',
      description: 'Create a new Giger sandbox environment with specified services and databases. Use discovery tools first to resolve commit SHAs and database names. Returns the generated namespace name.',
      inputSchema: {
        title: z.string().describe('Human-readable title for the environment'),
        expiration: z.string().describe('ISO 8601 expiration date (e.g., "2026-02-01T00:00:00.000Z")'),
        services: z.array(ServiceSchema).describe('Services to deploy'),
        databases: z.array(z.string()).describe('Database backup names to deploy (from list_available_databases)'),
      },
    },
    async ({ title, expiration, services, databases }) => {
      const body = {
        title,
        expiry: expiration,
        services: services.map(s => ({ ...s, follow: s.follow ?? false })),
        databases,
      };

      const result = await client.request<{ namespace: string }>('/admin/api/deploy', {
        method: 'POST',
        body,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_environment',
    {
      title: 'Get Environment',
      description: 'Get detailed information about an environment including its status, deployed services, databases, and readiness state.',
      inputSchema: {
        environment: z.string().describe('Environment name (e.g., "dev-mytask1")'),
      },
    },
    async ({ environment }) => {
      const result = await client.request<unknown>(`/environments/${environment}`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_my_environments',
    {
      title: 'List My Environments',
      description: 'List all environments owned by the current user.',
      inputSchema: {},
    },
    async () => {
      const result = await client.request<unknown>('/environments/mine');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'delete_environment',
    {
      title: 'Delete Environment',
      description: 'Permanently delete a sandbox environment and all its resources.',
      inputSchema: {
        environment: z.string().describe('Environment name to delete'),
      },
    },
    async ({ environment }) => {
      await client.request<unknown>(`/environments/${environment}`, { method: 'DELETE' });
      return {
        content: [{ type: 'text' as const, text: `Environment ${environment} deleted successfully.` }],
      };
    }
  );

  server.registerTool(
    'pause_environment',
    {
      title: 'Pause Environment',
      description: 'Pause an environment to save resources. Services cannot be deployed while paused. Use resume_environment to wake it up.',
      inputSchema: {
        environment: z.string().describe('Environment name to pause'),
      },
    },
    async ({ environment }) => {
      const result = await client.request<unknown>(`/environments/${environment}/pause`, { method: 'POST' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'resume_environment',
    {
      title: 'Resume Environment',
      description: 'Resume a paused environment.',
      inputSchema: {
        environment: z.string().describe('Environment name to resume'),
      },
    },
    async ({ environment }) => {
      const result = await client.request<unknown>(`/environments/${environment}/resume`, { method: 'POST' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'extend_environment',
    {
      title: 'Extend Environment',
      description: 'Extend the expiration date of an environment.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        expiration: z.string().describe('New expiration date (ISO 8601)'),
      },
    },
    async ({ environment, expiration }) => {
      const result = await client.request<unknown>(`/environments/${environment}/extend`, {
        method: 'POST',
        body: { expiration },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

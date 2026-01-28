import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GigerClient } from '../client.js';

export function registerServiceTools(server: McpServer, client: GigerClient) {
  server.registerTool(
    'list_services',
    {
      title: 'List Services',
      description: 'List all application services deployed in an environment with their status, branch, and commit info.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = await client.paginated<{
        service: string;
        branch: string;
        isFollowed: boolean;
        status: string;
        chartVersion: string;
        requestedCommit: { sha: string; author: string; message: string; buildId: number | null };
        deployedCommit: { sha: string; author: string; message: string; buildId: number | null } | null;
      }>(`/environments/${environment}/application-services`);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'deploy_latest_commit',
    {
      title: 'Deploy Latest Commit',
      description: 'Deploy the latest commit from the tracked branch to a service. The service must have subscribeToUpdates enabled or this triggers a one-time update.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        service: z.string().describe('Service name (e.g., "backend", "peo")'),
      },
    },
    async ({ environment, service }) => {
      const result = await client.request<unknown>(
        `/environments/${environment}/application-services/${service}/deploy-latest-commit`,
        { method: 'POST' }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'redeploy_service',
    {
      title: 'Redeploy Service',
      description: 'Re-run the Helm deployment for a service without changing the commit. Useful when Helm values have been updated or a deployment failed.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        service: z.string().describe('Service name'),
      },
    },
    async ({ environment, service }) => {
      const result = await client.request<unknown>(
        `/environments/${environment}/application-services/${service}/redeploy`,
        { method: 'POST' }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'update_service',
    {
      title: 'Update Service',
      description: 'Update a service configuration (branch, tag, helm values, auto-update setting).',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        service: z.string().describe('Service name'),
        tag: z.string().optional().describe('New commit SHA to deploy'),
        tagGroup: z.string().optional().describe('New branch name'),
        subscribeToUpdates: z.boolean().optional().describe('Enable/disable auto-deploy'),
        helmChartValues: z.string().optional().describe('Updated Helm values YAML'),
      },
    },
    async ({ environment, service, ...updates }) => {
      const body: Record<string, unknown> = {};
      if (updates.tag) body.tag = updates.tag;
      if (updates.tagGroup) body.tagGroup = updates.tagGroup;
      if (updates.subscribeToUpdates !== undefined) body.subscribeToUpdates = updates.subscribeToUpdates;
      if (updates.helmChartValues) body.helmChartValues = updates.helmChartValues;

      const result = await client.request<unknown>(
        `/environments/${environment}/application-services/${service}`,
        { method: 'PATCH', body }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'add_service',
    {
      title: 'Add Service',
      description: 'Add a new service to an existing environment.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        serviceDefinitionId: z.string().describe('Service definition ID (e.g., "time-off", "backend")'),
        tagGroup: z.string().describe('Branch name (e.g., "master", "dev")'),
        tag: z.string().describe('Commit SHA to deploy'),
        subscribeToUpdates: z.boolean().optional().describe('Enable auto-deploy (default: false)'),
        helmChartValues: z.string().optional().describe('Helm values YAML override'),
      },
    },
    async ({ environment, serviceDefinitionId, tagGroup, tag, subscribeToUpdates, helmChartValues }) => {
      const body: Record<string, unknown> = {
        serviceDefinitionId,
        tagGroup,
        tag,
      };
      if (subscribeToUpdates !== undefined) body.subscribeToUpdates = subscribeToUpdates;
      if (helmChartValues) body.helmChartValues = helmChartValues;

      const result = await client.request<unknown>(
        `/environments/${environment}/application-services`,
        { method: 'POST', body }
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

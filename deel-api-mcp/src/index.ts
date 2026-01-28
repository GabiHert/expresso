#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { join } from 'path';

import { CollectionLoader } from './services/collection-loader.js';
import { VariableResolver } from './services/variable-resolver.js';
import { RequestExecutor } from './services/request-executor.js';
import { PostmanSync } from './services/postman-sync.js';

const collectionsPath = process.env.DEEL_API_COLLECTIONS_PATH || './collections';
const postmanApiKey = process.env.POSTMAN_API_KEY || '';
const postmanWorkspaceId = process.env.POSTMAN_WORKSPACE_ID || '';
const defaultEnvName = process.env.DEEL_API_ENV_NAME || 'Dev';
const forbiddenEnvs = (process.env.DEEL_API_FORBIDDEN_ENVS || '').split(',').map(e => e.trim()).filter(Boolean);

let currentEnvName = defaultEnvName;

function getEnvPath(envName: string): string {
  return join(collectionsPath, `${envName}.postman_environment.json`);
}

function isEnvForbidden(envName: string): boolean {
  return forbiddenEnvs.some(forbidden => forbidden.toLowerCase() === envName.toLowerCase());
}

let collectionLoader = new CollectionLoader(collectionsPath);
let variableResolver = new VariableResolver(getEnvPath(currentEnvName));
let requestExecutor = new RequestExecutor(variableResolver);
const postmanSync = new PostmanSync(postmanApiKey, postmanWorkspaceId, collectionsPath, forbiddenEnvs);

function reloadCollections() {
  collectionLoader = new CollectionLoader(collectionsPath);
  variableResolver = new VariableResolver(getEnvPath(currentEnvName));
  requestExecutor = new RequestExecutor(variableResolver);
}

function switchEnvironment(envName: string): { success: boolean; message: string } {
  if (isEnvForbidden(envName)) {
    return { success: false, message: `Environment "${envName}" is forbidden.` };
  }
  currentEnvName = envName;
  variableResolver = new VariableResolver(getEnvPath(currentEnvName));
  requestExecutor = new RequestExecutor(variableResolver);
  return { success: true, message: `Switched to environment: ${envName}` };
}

const server = new McpServer({
  name: 'deel-api-mcp',
  version: '1.0.0'
});

server.tool(
  'deel_list_collections',
  'List all available Postman collections',
  {},
  async () => {
    const collections = collectionLoader.listCollections();

    const text = collections
      .map(c => `- ${c.name} (${c.requestCount} requests)`)
      .join('\n');

    return {
      content: [{ type: 'text', text: `Available Collections:\n${text}` }]
    };
  }
);

server.tool(
  'deel_list_requests',
  'List all requests in a collection or all collections',
  {
    collection: z.string().optional().describe('Collection name to filter by')
  },
  async ({ collection }) => {
    const requests = collectionLoader.listRequests(collection);

    if (requests.length === 0) {
      return {
        content: [{ type: 'text', text: collection ? `No requests found in collection "${collection}"` : 'No requests found' }]
      };
    }

    const text = requests
      .map(r => `- [${r.method}] ${r.name} (${r.collection}) - ${r.path}`)
      .join('\n');

    return {
      content: [{ type: 'text', text: `Available Requests:\n${text}` }]
    };
  }
);

server.tool(
  'deel_execute',
  'Execute a Postman request by name',
  {
    request_name: z.string().describe('Name of the request to execute'),
    collection: z.string().optional().describe('Collection name (optional if request name is unique)'),
    variables: z.record(z.string()).optional().describe('Override variables for this request'),
    body: z.any().optional().describe('Override request body (for POST/PUT requests)')
  },
  async ({ request_name, collection, variables, body }) => {
    const flatRequest = collectionLoader.findRequest(request_name, collection);

    if (!flatRequest) {
      const available = collectionLoader.listRequests(collection);
      const suggestions = available
        .filter(r => r.name.toLowerCase().includes(request_name.toLowerCase()))
        .slice(0, 5)
        .map(r => r.name);

      return {
        content: [{
          type: 'text',
          text: `Request "${request_name}" not found.${suggestions.length > 0 ? `\nDid you mean: ${suggestions.join(', ')}?` : ''}`
        }]
      };
    }

    const result = await requestExecutor.execute(flatRequest, { variables, body });

    return {
      content: [{
        type: 'text',
        text: `Request: ${flatRequest.request.method} ${flatRequest.name}
Status: ${result.status} ${result.statusText}
Time: ${result.executionTime}ms

Response:
${JSON.stringify(result.body, null, 2)}`
      }]
    };
  }
);

server.tool(
  'deel_get_variables',
  'Get current environment variables',
  {
    filter: z.string().optional().describe('Filter variables by key pattern (regex)')
  },
  async ({ filter }) => {
    const vars = variableResolver.getFilteredVariables(filter);

    const safeVars = { ...vars };
    if (safeVars.password) safeVars.password = '***';
    if (safeVars.token) safeVars.token = safeVars.token.substring(0, 20) + '...';
    if (safeVars.refresh_token) safeVars.refresh_token = safeVars.refresh_token.substring(0, 20) + '...';

    const text = Object.entries(safeVars)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    return {
      content: [{ type: 'text', text: `Environment Variables:\n${text || 'No variables found'}` }]
    };
  }
);

server.tool(
  'deel_set_variable',
  'Set an environment variable',
  {
    key: z.string().describe('Variable name'),
    value: z.string().describe('Variable value')
  },
  async ({ key, value }) => {
    variableResolver.setVariable(key, value);

    return {
      content: [{ type: 'text', text: `Variable "${key}" set successfully` }]
    };
  }
);

server.tool(
  'deel_switch_env',
  'Switch to a different Postman environment',
  {
    environment: z.string().describe('Environment name to switch to (e.g., DEV, DEMO, GIGER, LOCAL)')
  },
  async ({ environment }) => {
    const result = switchEnvironment(environment);
    return {
      content: [{ type: 'text', text: result.message }]
    };
  }
);

server.tool(
  'deel_current_env',
  'Show the current environment and list forbidden environments',
  {},
  async () => {
    const text = `Current Environment: ${currentEnvName}\nForbidden Environments: ${forbiddenEnvs.join(', ') || 'none'}`;
    return {
      content: [{ type: 'text', text }]
    };
  }
);

server.tool(
  'deel_sync',
  'Sync collections from Postman workspace (requires POSTMAN_API_KEY and POSTMAN_WORKSPACE_ID)',
  {},
  async () => {
    if (!postmanApiKey || !postmanWorkspaceId) {
      return {
        content: [{
          type: 'text',
          text: 'Error: POSTMAN_API_KEY and POSTMAN_WORKSPACE_ID environment variables are required for sync'
        }]
      };
    }

    const result = await postmanSync.syncCollections();
    reloadCollections();

    let text = '';
    if (result.synced.length > 0) {
      text += `Synced:\n${result.synced.map(s => `  - ${s}`).join('\n')}\n\n`;
    }
    if (result.errors.length > 0) {
      text += `Errors:\n${result.errors.map(e => `  - ${e}`).join('\n')}`;
    }
    if (result.synced.length === 0 && result.errors.length === 0) {
      text = 'No collections found to sync';
    }

    return {
      content: [{ type: 'text', text: text.trim() }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

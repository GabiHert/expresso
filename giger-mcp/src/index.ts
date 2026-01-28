#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GigerClient } from './client.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerEnvironmentTools } from './tools/environments.js';
import { registerServiceTools } from './tools/services.js';
import { registerNatsTools } from './tools/nats.js';
import { registerDatabaseTools } from './tools/databases.js';
import { registerKubectlTools } from './tools/kubectl.js';

const server = new McpServer({
  name: 'giger',
  version: '1.0.0',
});

const client = new GigerClient();

registerDiscoveryTools(server, client);
registerEnvironmentTools(server, client);
registerServiceTools(server, client);
registerNatsTools(server, client);
registerDatabaseTools(server, client);
registerKubectlTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

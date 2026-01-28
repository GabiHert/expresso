import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { execSync } from 'child_process';

function run(cmd: string, timeout = 15000): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err: any) {
    return err.stderr?.trim() || err.stdout?.trim() || err.message;
  }
}

export function registerKubectlTools(server: McpServer) {
  server.registerTool(
    'k8s_get_pods',
    {
      title: 'Get Pods',
      description: 'List pods in a Giger environment namespace. Shows name, status, restarts, and age.',
      inputSchema: {
        environment: z.string().describe('Environment name (e.g., "dev-qdayg6lcdi")'),
      },
    },
    async ({ environment }) => {
      const result = run(`kubectl get pods -n ${environment} -o wide --no-headers`);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_get_pod_logs',
    {
      title: 'Get Pod Logs',
      description: 'Get logs from a pod in a Giger environment. Optionally specify container name and line limit.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        pod: z.string().describe('Pod name (from k8s_get_pods)'),
        container: z.string().optional().describe('Container name (for multi-container pods)'),
        tail: z.number().optional().describe('Number of lines from the end (default: 100)'),
        previous: z.boolean().optional().describe('Get logs from previous container instance (for crash loops)'),
      },
    },
    async ({ environment, pod, container, tail, previous }) => {
      let cmd = `kubectl logs -n ${environment} ${pod}`;
      if (container) cmd += ` -c ${container}`;
      cmd += ` --tail=${tail ?? 100}`;
      if (previous) cmd += ' --previous';
      const result = run(cmd, 30000);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_describe_pod',
    {
      title: 'Describe Pod',
      description: 'Get detailed information about a pod including events, conditions, and container statuses.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        pod: z.string().describe('Pod name'),
      },
    },
    async ({ environment, pod }) => {
      const result = run(`kubectl describe pod -n ${environment} ${pod}`, 15000);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_get_events',
    {
      title: 'Get Events',
      description: 'Get Kubernetes events for a namespace. Useful for diagnosing deployment issues, scheduling failures, and resource problems.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = run(`kubectl get events -n ${environment} --sort-by='.lastTimestamp'`);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_get_jobs',
    {
      title: 'Get Jobs',
      description: 'List Kubernetes jobs in the namespace. Useful for checking migration and deploy job status.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = run(`kubectl get jobs -n ${environment} --no-headers`);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_get_deployments',
    {
      title: 'Get Deployments',
      description: 'List deployments and their ready/available status.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
      },
    },
    async ({ environment }) => {
      const result = run(`kubectl get deployments -n ${environment}`);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'k8s_port_forward',
    {
      title: 'Port Forward',
      description: 'Start a port-forward to a service in the namespace. Runs in background. Returns the process info.',
      inputSchema: {
        environment: z.string().describe('Environment name'),
        service: z.string().describe('Service name (e.g., "postgres-deel", "peo")'),
        localPort: z.number().describe('Local port to bind'),
        remotePort: z.number().describe('Remote port on the service'),
      },
    },
    async ({ environment, service, localPort, remotePort }) => {
      try {
        execSync(
          `kubectl port-forward -n ${environment} svc/${service} ${localPort}:${remotePort} &`,
          { encoding: 'utf-8', timeout: 3000, shell: '/bin/bash' }
        );
        return { content: [{ type: 'text' as const, text: `Port-forward started: localhost:${localPort} -> ${service}:${remotePort} in ${environment}` }] };
      } catch {
        return { content: [{ type: 'text' as const, text: `Port-forward initiated: localhost:${localPort} -> ${service}:${remotePort}` }] };
      }
    }
  );
}

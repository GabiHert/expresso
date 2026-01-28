<!--
+======================================================================+
| LAYER: DOMAIN                                                          |
| STATUS: Current                                                        |
+----------------------------------------------------------------------+
| NAVIGATION:                                                            |
| - Parent: .ai/docs/giger/README.md                                    |
| - Related: .ai/docs/giger/api-reference.md                            |
| - Index: .ai/INDEX.md                                                  |
+======================================================================+
-->

# Giger MCP Integration Guide

Design guide for building an MCP server that enables AI to manage Giger sandbox environments programmatically.

---

## Overview

- **What**: Blueprint for a Giger MCP server exposing sandbox management tools to Claude
- **Why**: Enable AI-driven development workflows where environments are created, tested, and inspected without leaving the CLI
- **When**: During `/task-start` to create environments, during development to deploy and test, during `/task-done` to cleanup

---

## Ideal AI Development Workflow

```
/task-start (with giger integration)
    |
    +-- 1. Create giger environment
    |       POST /admin/api/v1/environments/
    |       Configure services with task branch
    |
    +-- 2. Poll for readiness
    |       GET /admin/api/v1/environments/:env/status
    |       Wait until status === "ready"
    |
    +-- 3. Set up port-forwarding (kubectl)
    |       DB access for sql-query MCP
    |       Service HTTP access
    |
    +-- 4. Connect observability
    |       Datadog MCP for logs (filter by namespace)
    |       NATS streams via Giger API
    |
    +-- Development loop:
    |   +-- Write code
    |   +-- Deploy latest commit to giger
    |   +-- Test via HTTP requests
    |   +-- Check Datadog logs
    |   +-- Inspect NATS messages
    |   +-- Query DB state
    |
    +-- /task-done
            Delete environment or let it expire
```

---

## MCP Server Tools Design

### Environment Lifecycle

| Tool | Giger Endpoint | Parameters | Purpose |
|------|---------------|------------|---------|
| `create_environment` | `POST /environments/` | name, title, services[], databases[], expiration | Create sandbox |
| `get_environment_status` | `GET /environments/:env` | environment | Check info + status |
| `wait_for_ready` | `GET /environments/:env/status` (poll) | environment, timeout | Block until ready |
| `list_my_environments` | `GET /environments/mine` | - | List user's envs |
| `delete_environment` | `DELETE /environments/:env` | environment | Cleanup |
| `pause_environment` | `POST /environments/:env/pause` | environment | Save resources |
| `resume_environment` | `POST /environments/:env/resume` | environment | Wake up |
| `extend_environment` | `POST /environments/:env/extend` | environment, date | Extend expiry |

### Service Management

| Tool | Giger Endpoint | Parameters | Purpose |
|------|---------------|------------|---------|
| `list_services` | `GET /environments/:env/application-services` | environment | List deployed services |
| `deploy_latest_commit` | `POST /.../deploy-latest-commit` | environment, service | Update to latest |
| `redeploy_service` | `POST /.../redeploy` | environment, service | Re-run Helm deploy |
| `get_service_definitions` | `GET /service-definitions/` | filterByQuery | Available services |

### NATS Streams

| Tool | Giger Endpoint | Parameters | Purpose |
|------|---------------|------------|---------|
| `list_streams` | `GET /environments/:env/streams` | environment | List NATS streams |
| `get_stream_messages` | `GET /.../streams/:stream/messages` | environment, stream | Read messages |
| `publish_message` | `POST /.../messages/publish` | environment, stream, subject, payload | Send message |
| `get_stream_consumers` | `GET /.../streams/:stream/consumers` | environment, stream | List consumers |

### Database

| Tool | Giger Endpoint | Parameters | Purpose |
|------|---------------|------------|---------|
| `list_databases` | `GET /environments/:env/database-services` | environment | List DBs |
| `reset_database` | `POST /.../database-services/:type/:name/reset` | environment, dbType, dbName | Reset to snapshot |
| `list_available_databases` | `GET /databases/deployable-databases` | - | What can be deployed |

### Observability (via Datadog MCP)

| Tool | Source | Parameters | Purpose |
|------|--------|------------|---------|
| `get_environment_logs` | Datadog MCP | service, env=namespace, time_range | Fetch logs |
| `get_error_logs` | Datadog MCP | env=namespace, status=error | Error detection |

---

## Authentication Strategy

### Option A: Session Cookie Extraction (Recommended for MVP)

```typescript
// User logs into Giger UI in browser
// MCP server extracts session cookie from browser cookie store
// Or user provides cookie manually

const GIGER_SESSION_COOKIE = process.env.GIGER_SESSION_COOKIE;
const GIGER_BASE_URL = process.env.GIGER_BASE_URL;

async function gigerRequest(method, path, body?) {
  return fetch(`${GIGER_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `giger.sid=${GIGER_SESSION_COOKIE}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
}
```

**Pros**: Works immediately, full API access
**Cons**: Cookie expires in 7 days, requires manual refresh

### Option B: Port-Forward + Dev Mode

```bash
# Port-forward giger from cluster
kubectl port-forward svc/giger 3000:3000 -n giger

# Set ME env var in MCP server
ME=your@deel.com
```

```typescript
// MCP server connects to localhost:3000 with ME header simulation
// Works only with dev-mode giger instance
```

**Pros**: No cookie management
**Cons**: Requires port-forward, only works with dev-mode giger

### Option C: API Token (Requires Giger Modification)

Add a new auth guard that validates bearer tokens stored in DB:

```typescript
// New: ApiTokenGuard
@Injectable()
class ApiTokenGuard implements CanActivate {
  async canActivate(context) {
    const token = request.headers['x-api-token'];
    const user = await this.userService.findByApiToken(token);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
```

**Pros**: Clean programmatic access, no expiry issues
**Cons**: Requires code change to giger

---

## Configuration

### MCP Server Config (`.mcp.json`)

```json
{
  "mcpServers": {
    "giger": {
      "command": "node",
      "args": ["path/to/giger-mcp/dist/index.js"],
      "env": {
        "GIGER_BASE_URL": "https://giger.internal.deel.com",
        "GIGER_SESSION_COOKIE": "s%3A...",
        "GIGER_DEFAULT_SERVICES": "backend,frontend,admin",
        "GIGER_DEFAULT_DATABASES": "deel,employment",
        "GIGER_DEFAULT_EXPIRY_HOURS": "48"
      }
    }
  }
}
```

### Datadog MCP Config (Already Available)

```json
{
  "mcpServers": {
    "datadog": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/shelfio/datadog-mcp.git", "datadog-mcp"],
      "env": {
        "DD_API_KEY": "your-datadog-api-key",
        "DD_APP_KEY": "your-datadog-app-key",
        "DD_SITE": "datadoghq.eu"
      }
    }
  }
}
```

---

## Datadog Log Correlation

Giger environments send logs tagged with namespace-based identifiers:

```
# Query pattern for environment logs
kube_namespace:dev-abc12 service:backend status:error

# Or via Datadog MCP tool
get_logs(query="kube_namespace:dev-abc12", time_range="1h", filters={status: "error"})
```

Available Datadog log filters for giger environments:
- `kube_namespace`: The environment name (e.g., `dev-abc12`)
- `service`: Individual service name
- `status`: `info` | `warn` | `error`
- `env`: Cluster/stage identifier

---

## Port Forwarding Automation

### Database Access

```bash
# Find postgres pod in environment
kubectl get pods -n dev-abc12 -l app.kubernetes.io/name=postgres

# Port-forward database
kubectl port-forward -n dev-abc12 svc/postgres-deel 5432:5432

# Now sql-query MCP can connect to localhost:5432
```

### Service HTTP Access

```bash
# Direct service access (in-cluster DNS)
# Services are accessible at: http://{service}-{namespace}.{GIGER_DOMAIN}
# Example: https://backend-dev-abc12.giger.internal.deel.com

# Or port-forward for local access
kubectl port-forward -n dev-abc12 svc/backend-main 3001:80
```

### NATS Access

```bash
# Port-forward NATS
kubectl port-forward -n dev-abc12 svc/nats 4222:4222

# Now NATS CLI can connect to localhost:4222
nats stream ls --server=localhost:4222
```

---

## Implementation Phases

### Phase 1: Read-Only MCP (Quick Win)

Tools: `list_my_environments`, `get_environment_status`, `list_services`, `list_streams`, `get_stream_messages`

- No environment creation/modification
- Uses session cookie auth
- Provides visibility into existing environments

### Phase 2: Environment Management

Tools: `create_environment`, `delete_environment`, `pause_environment`, `resume_environment`, `deploy_latest_commit`

- Full lifecycle management
- Integrated with `/task-start` and `/task-done`
- Auto-cleanup on task completion

### Phase 3: Full Development Loop

Tools: All Phase 1+2 + `publish_message`, `reset_database`, port-forwarding automation

- NATS message publishing for testing event flows
- Database reset for clean state testing
- Automated port-forward setup
- Datadog log integration

---

## Integration with Task Workflow

### In `/task-start`

```
1. Parse task requirements (which services needed)
2. Call create_environment with task branch
3. Poll wait_for_ready
4. Set up port-forwards
5. Store environment name in task metadata
```

### During Development

```
1. Code changes → deploy_latest_commit
2. Test → HTTP requests to service
3. Debug → get_environment_logs (Datadog)
4. Inspect → get_stream_messages (NATS)
5. Reset → reset_database if needed
```

### In `/task-done`

```
1. Read environment from task metadata
2. Call delete_environment (or pause to save state)
3. Clean up port-forwards
```

---

## Common Pitfalls

1. **Cookie expiry**: Session cookies last 7 days; automate refresh or alert when expired
2. **Environment readiness**: Takes time; always poll `/status` before interacting with services
3. **NATS in-cluster DNS**: Stream operations require the MCP to call Giger API, not direct NATS connection
4. **Database snapshots**: Must select from available backup instances; not all databases have recent snapshots
5. **Helm chart values**: Invalid YAML will fail validation with line/column error details
6. **Permission requirements**: User must have SpiceDB permissions for all operations
7. **Paused environments**: Cannot deploy services while paused; resume first

---

## Related Documentation

- [API Reference](./api-reference.md) - Complete endpoint reference
- [Giger Overview](./README.md) - Architecture and setup
- [NATS Events](./../_shared/nats-events.md) - Event patterns

---

_Created: 2026-01-23_
_Last Updated: 2026-01-23_

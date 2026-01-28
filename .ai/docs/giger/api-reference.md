<!--
+======================================================================+
| LAYER: DOMAIN                                                          |
| STATUS: Current                                                        |
+----------------------------------------------------------------------+
| NAVIGATION:                                                            |
| - Parent: .ai/docs/giger/README.md                                    |
| - Related: .ai/docs/giger/mcp-integration.md                          |
| - Index: .ai/INDEX.md                                                  |
+======================================================================+
-->

# Giger API Reference

Complete REST API reference for the Giger sandbox management platform, focused on programmatic access for MCP integration.

---

## Overview

- **What**: All REST endpoints exposed by Giger's NestJS backend
- **Why**: Enable AI tooling (MCP servers) to create, manage, and interact with sandbox environments
- **When**: Building automation around sandbox lifecycle, service deployment, NATS streams, and log inspection

---

## Authentication

### OAuth2 Session (Primary)

All `/admin/api/*` endpoints require an authenticated session:

1. User logs in via Okta at `/auth/login`
2. Server sets `giger.sid` cookie (7-day rolling expiry)
3. All subsequent requests include this cookie

### Dev Mode Bypass

When `FEATURE_NATIVE_OAUTH2=true` and `__DEV__=true`:
- Set `ME=your@email.com` environment variable
- `OAuthSessionGuard` accepts requests without Okta flow
- File: `src/modules/auth/guards/oauth-session.guard.ts:31-40`

### Programmatic Access Options

| Method | Scope | How |
|--------|-------|-----|
| Session cookie | Full API | Extract `giger.sid` after browser login |
| Dev mode (`ME` env) | Full API (local only) | Set env var, no cookie needed |
| SCIM token | `/scim/v2/*` only | `Authorization: Bearer {OKTA_SCIM_TOKEN}` |
| Webhook signature | Webhooks only | HMAC-SHA256 in `x-signature-256` header |

### Permission System (SpiceDB)

Most endpoints use `@RequirePermission` decorator:
```typescript
@RequirePermission({
  permission: 'can_sandboxes_create',
  objectType: 'sandbox',
  objectIdResolver: ObjectIdResolvers.static('deel')
})
```

Common permissions:
- `can_sandboxes_create` / `can_sandboxes_view` / `sandboxes_redeploy`
- `can_streams_list` / `can_streams_view` / `can_streams_messages_list`
- `can_streams_messages_publish` / `can_streams_messages_delete`
- `can_cronjobs_list` / `can_cronjobs_trigger`

---

## Environments API

**Base path**: `/admin/api/v1/environments`

### Create Environment

```
POST /admin/api/v1/environments/
Permission: can_sandboxes_create
```

**Request Body** (CreateEnvironmentDto):
```json
{
  "name": "dev-mytest",
  "title": "My Test Environment",
  "expiration": "2025-02-01T00:00:00.000Z",
  "services": [
    {
      "service": "backend",
      "serviceDefinitionId": "uuid-of-service-def",
      "tag": "abc123def",
      "tagGroup": "main",
      "subscribeToUpdates": true,
      "helmChartVersion": "1.0.0",
      "helmChartValues": "replicas: 1\nresources:\n  requests:\n    memory: 256Mi"
    }
  ],
  "databases": [
    {
      "database": "deel",
      "databaseBackupType": "uuid-of-backup-type",
      "databaseBackupInstance": "uuid-of-backup-instance",
      "helmChartVersion": "1.0.0",
      "helmChartUri": "oci://chart-registry/postgres",
      "helmValues": "storage: 10Gi"
    }
  ]
}
```

**Validation Rules:**
- `name`: Must match `/^dev-[a-z0-9]{5,}$/`
- `title`: 5-100 characters
- `expiration`: ISO datetime, must be in the future
- `services[].helmChartValues`: Must be valid YAML
- `databases[].memoryLimitMb` > `databases[].memoryRequestMb` (if both set)

### List My Environments

```
GET /admin/api/v1/environments/mine
```

**Response** (MyEnvironmentResponseDto[]):
```json
[
  {
    "id": "dev-abc12",
    "title": "My Test",
    "author": "gabriel",
    "isActive": true,
    "isLocked": false,
    "isHealthy": true,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "expiresAt": "2025-02-01T00:00:00.000Z"
  }
]
```

### List Others' Environments

```
GET /admin/api/v1/environments/others?filterByQuery=&sortBy=createdAt&sortOrder=desc&limit=10
```

**Query Parameters:**
- `filterByQuery`: Search string
- `sortBy`: `id` | `title` | `author` | `createdAt` | `expiresAt`
- `sortOrder`: `asc` | `desc`
- `cursor`: Pagination cursor
- `limit`: 1-1000 (default: 10)
- `filterByAuthor`: Filter by owner

### Get Environment Info

```
GET /admin/api/v1/environments/:environment
```

**Response** (EnvironmentInfoResponseDto):
```json
{
  "data": {
    "id": "dev-abc12",
    "title": "My Test",
    "author": "gabriel",
    "status": "active",
    "isLocked": false,
    "isPaused": false,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "expiresAt": "2025-02-01T00:00:00.000Z",
    "minio": {
      "id": "minio-access-key",
      "password": "minio-secret-key"
    }
  }
}
```

Status values: `active` | `paused` | `inactive` | `invalid`

### Get Environment Status (Readiness)

```
GET /admin/api/v1/environments/:environment/status
```

**Response** (EnvironmentStatusResponseDto):
```json
{
  "status": "ready",
  "details": {
    "helm": {
      "serviceStatus": "ready",
      "apps": {
        "backend": "ready",
        "frontend": "ready",
        "postgres-deel": "ready"
      }
    }
  }
}
```

Status: `ready` | `pending`

### Delete Environment

```
DELETE /admin/api/v1/environments/:environment
Response: 204 No Content
```

### Redeploy Environment

```
POST /admin/api/v1/environments/:environment/redeploy
Response: 204 No Content
```

### Lock / Unlock

```
POST /admin/api/v1/environments/:environment/lock
POST /admin/api/v1/environments/:environment/unlock
Response: 204 No Content
```

### Extend Expiration

```
POST /admin/api/v1/environments/:environment/extend
```

**Body:**
```json
{
  "date": "2025-03-01T00:00:00.000Z"
}
```

### Pause / Resume

```
POST /admin/api/v1/environments/:environment/pause
POST /admin/api/v1/environments/:environment/resume
Response: 204 No Content
```

**Pause** scales down user services, redirects frontends to status page.
**Resume** scales up, redeploys all services.

### Check Name Availability

```
POST /admin/api/v1/environments/check_availability
Permission: can_sandboxes_create
```

**Body:**
```json
{
  "name": "dev-mytest"
}
```

### Get Stats

```
GET /admin/api/v1/environments/stats
```

Returns: `{total, active, paused, expiringInTheNextHour}`

---

## Application Services API

**Base path**: `/admin/api/v1/environments/:environment/application-services`

### List Application Services

```
GET /admin/api/v1/environments/:environment/application-services?limit=50
```

**Response:**
```json
{
  "data": [
    {
      "service": "backend",
      "branch": "main",
      "isFollowed": true,
      "status": "deployed",
      "chartVersion": "1.0.0",
      "values": {},
      "requestedCommit": {
        "sha": "abc123",
        "author": "developer",
        "message": "fix: something",
        "buildId": 12345,
        "updatedAt": "2025-01-20T10:00:00Z"
      },
      "deployedCommit": {
        "sha": "abc123",
        "author": "developer",
        "message": "fix: something",
        "buildId": 12345,
        "updatedAt": "2025-01-20T10:00:00Z"
      },
      "link": "https://backend-dev-abc12.giger.example.com"
    }
  ],
  "pagination": {
    "cursor": null,
    "limit": 50,
    "isLastPage": true
  }
}
```

### Add Application Service

```
POST /admin/api/v1/environments/:environment/application-services
Response: 201 Created
```

### Update Application Service

```
PUT /admin/api/v1/environments/:environment/application-services/:service
Response: 204 No Content
```

### Delete Application Service

```
DELETE /admin/api/v1/environments/:environment/application-services/:service
Response: 204 No Content
```

### Deploy Latest Commit

```
POST /admin/api/v1/environments/:environment/application-services/:service/deploy-latest-commit
Response: 204 No Content
```

Updates the service to the newest commit on its configured branch.

### Redeploy Application Service

```
POST /admin/api/v1/environments/:environment/application-services/:service/redeploy
Response: 204 No Content
```

Re-runs the Helm deployment for a single service.

---

## Database Services API

**Base path**: `/admin/api/v1/environments/:environment/database-services`

### List Database Services

```
GET /admin/api/v1/environments/:environment/database-services
```

**Response:**
```json
{
  "data": [
    {
      "name": "postgres-deel",
      "status": "deployed",
      "database": {
        "name": "deel",
        "group": "core",
        "dump": "deel-prod",
        "backup": "snapshot",
        "type": "postgres",
        "snapshotCreatedAt": "2025-01-15T00:00:00Z"
      }
    }
  ]
}
```

### Reset Database

```
POST /admin/api/v1/environments/:environment/database-services/:dbType/:dbName/reset
Response: 204 No Content
```

Resets the database pod and restores from snapshot.

---

## NATS Streams API (Per Environment)

**Base path**: `/admin/api/v1/environments/:environment/streams`

### List Streams

```
GET /admin/api/v1/environments/:environment/streams
Permission: can_streams_list (on sandbox)
```

### Get Stream Info

```
GET /admin/api/v1/environments/:environment/streams/:stream
Permission: can_streams_view (on sandbox)
```

### Get Stream Messages

```
GET /admin/api/v1/environments/:environment/streams/:stream/messages
Permission: can_streams_messages_list (on sandbox)
```

Returns last N messages (default 15). Payload may be redacted if user lacks `can_streams_messages_payload_view` permission.

### Get Message by Sequence

```
GET /admin/api/v1/environments/:environment/streams/:stream/messages/:seq
Permission: can_streams_messages_view (on sandbox)
```

### Delete Message

```
DELETE /admin/api/v1/environments/:environment/streams/:stream/messages/:seq
Permission: can_streams_messages_delete (on sandbox)
Response: 200 {deleted: true}
```

### Purge Stream

```
POST /admin/api/v1/environments/:environment/streams/:stream/purge
Permission: can_streams_messages_purge (on sandbox)
Response: 200
```

### Publish Message

```
POST /admin/api/v1/environments/:environment/streams/:stream/messages/publish
Permission: can_streams_messages_publish (on sandbox)
```

**Body** (PostStreamMessageBodyDTO):
```json
{
  "subject": "orders.created",
  "payload": "{\"orderId\": \"123\", \"amount\": 100}"
}
```

**Response:** `{seq: number}`

### List Stream Consumers

```
GET /admin/api/v1/environments/:environment/streams/:stream/consumers
Permission: can_streams_consumers_list (on sandbox)
```

### Get Consumer Info

```
GET /admin/api/v1/environments/:environment/streams/:stream/consumers/:consumer
Permission: can_streams_consumers_list (on sandbox)
```

---

## NATS Streams API (Global Clusters)

**Base path**: `/admin/api/v1/nats_streams`

Same endpoints as per-environment but using cluster names instead:

```
GET  /admin/api/v1/nats_streams/envs
GET  /admin/api/v1/nats_streams/:cluster/list
GET  /admin/api/v1/nats_streams/:cluster/info/:stream
GET  /admin/api/v1/nats_streams/:cluster/:stream/messages
GET  /admin/api/v1/nats_streams/:cluster/:stream/messages/:seq
DELETE /admin/api/v1/nats_streams/:cluster/:stream/messages/:seq
POST /admin/api/v1/nats_streams/:cluster/:stream/purge
POST /admin/api/v1/nats_streams/:cluster/:stream/messages/publish
GET  /admin/api/v1/nats_streams/:cluster/:stream/consumers
GET  /admin/api/v1/nats_streams/:cluster/:stream/consumers/:consumer
```

---

## Service Definitions API

**Base path**: `/admin/api/v1/service-definitions`

### List Service Definitions

```
GET /admin/api/v1/service-definitions?filterByQuery=backend&limit=10
Permission: service_definitions_list
```

### Get Service Definition

```
GET /admin/api/v1/service-definitions/:id
Permission: service_definitions_view
```

**Response:**
```json
{
  "id": "uuid",
  "name": "backend",
  "version": 3,
  "helmChartUri": "oci://registry/charts/backend",
  "defaultHelmChartVersion": "1.2.0",
  "defaultHelmChartValues": "replicas: 1\n...",
  "owner": "platform-team@deel.com",
  "createdAt": "2024-06-01T00:00:00Z"
}
```

---

## Repositories API

**Base path**: `/admin/api/v1/repositories`

### Get Branches

```
GET /admin/api/v1/repositories/:repository/branches?filterByQuery=feat&limit=20
```

### Get Commits

```
GET /admin/api/v1/repositories/:repository/branches/:branch/commits?limit=10
```

---

## Restorable Databases API

**Base path**: `/admin/api/databases`

### List Databases

```
GET /admin/api/databases?filterByQuery=deel&limit=10
Permission: sandboxes_create
```

### Get Deployable Databases

```
GET /admin/api/databases/deployable-databases
Permission: sandboxes_view
```

Returns databases with backup types and selectable configuration.

### Get Backup Types

```
GET /admin/api/databases/:id/backup_types
Permission: sandboxes_create
```

### Get Backup Instances

```
GET /admin/api/databases/:id/backup_instances?backupType=uuid&limit=10
Permission: sandboxes_create
```

---

## Cronjobs API

**Base path**: `/admin/api/v1/cronjobs`

### List Namespaces

```
GET /admin/api/v1/cronjobs/namespaces
Permission: can_cronjobs_list
```

### Get Cronjobs for Namespace

```
GET /admin/api/v1/cronjobs/:namespace
Permission: can_cronjobs_list
```

### Trigger Cronjob

```
POST /admin/api/v1/cronjobs/:namespace/:cronjob/trigger
Permission: can_cronjobs_trigger
Response: 204 No Content
```

### Environment-Scoped Cronjobs

```
GET /admin/api/v1/environments/:environment/cronjobs
POST /admin/api/v1/environments/:environment/cronjobs/:cronjob/trigger
```

---

## Feature Flags API

**Base path**: `/admin/api/features`

### List Services with Flags

```
GET /admin/api/features/services
```

### Get Flags for Service

```
GET /admin/api/features/services/:service
```

### Create Flag

```
POST /admin/api/features/
Body: {name, data, service, stage, ...}
```

### Update Flag

```
PUT /admin/api/features/
Body: {name, data, service, stage, ...}
```

---

## Deploy API (Legacy)

**Base path**: `/admin/api/deploy`

### Get Repositories with Builds

```
GET /admin/api/deploy/repositories
```

Returns repositories with their latest builds per branch.

### Deploy (Legacy)

```
POST /admin/api/deploy
Permission: sandboxes_create
```

**Body** (DeployRequestDto):
```json
{
  "title": "My Environment",
  "expiry": "2025-02-01T00:00:00Z",
  "services": [
    {
      "name": "backend",
      "branch": "main",
      "follow": true,
      "sha": "abc123def456",
      "chartVersion": "1.0.0",
      "chartValuesOverride": "replicas: 1"
    }
  ],
  "databases": ["deel", "employment"],
  "natsJetstreamConfigVersion": "1.0.0",
  "enableNatsPersistentStorage": false,
  "deploymentStrategy": "v6",
  "values": {},
  "dedicatedEnvironment": "optional-name"
}
```

**Response:**
```json
{"namespace": "dev-randomchars"}
```

---

## Health API

```
GET /health/liveness   → 200 OK (always)
GET /health/readiness  → 200 OK (if DB connected)
```

---

## Environment Readiness Detection

Status is determined heuristically:

1. Check for pending Kubernetes Jobs in namespace
2. Check all Helm releases have status "deployed"
3. If both pass → `ready`, otherwise → `pending`

**Polling approach:**
```
loop:
  GET /admin/api/v1/environments/:env/status
  if response.status === "ready": break
  wait 10 seconds
```

---

## Key Data Types

### Environment Status Values

| Status | Meaning |
|--------|---------|
| `active` | Running, all services up |
| `paused` | Scaled down, frontends redirected |
| `inactive` | Expired or being deleted |
| `invalid` | Error state |

### Deployment Strategies

| Strategy | Description |
|----------|-------------|
| `v4` | Legacy deployment |
| `v5` | Improved with ArgoCD |
| `v6` | Latest with enhanced NATS support |

---

## Common Pitfalls

1. **Environment names**: Must match `dev-[a-z0-9]{5,}` exactly
2. **Expiration dates**: Must be in the future (server validates)
3. **Helm chart values**: Must be valid YAML (Zod validates with line/column errors)
4. **Status polling**: Environments take time to become ready; poll `/status` endpoint
5. **Paused environments**: Cannot deploy services; must resume first
6. **Locked environments**: Cannot modify; must unlock first
7. **NATS message redaction**: Payload may be "REDACTED" without `can_streams_messages_payload_view` permission

---

## Related Documentation

- [Giger Overview](./README.md) - Architecture and dev setup
- [MCP Integration Guide](./mcp-integration.md) - Building a Giger MCP server

---

_Created: 2026-01-23_
_Last Updated: 2026-01-23_

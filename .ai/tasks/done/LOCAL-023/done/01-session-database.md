<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 01-session-database.md                                ║
║ TASK: LOCAL-023                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Create SessionDatabase Abstraction Layer

## Objective

Create a new `SessionDatabase.ts` file that provides a clean abstraction over SQLite operations for session management. This layer will handle database initialization, schema creation, CRUD operations, and migration from the existing JSON format.

## Pre-Implementation

1. Install sql.js dependency:
   ```bash
   cd vscode-extension && npm install sql.js
   npm install --save-dev @types/sql.js
   ```

2. Review the existing SessionManager to understand all operations needed

## Implementation Steps

### Step 1: Create SessionDatabase class

**File**: `vscode-extension/src/services/SessionDatabase.ts`

**Instructions**:

Create the database abstraction with the following structure:

```typescript
import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { CockpitSession } from '../types';

export class SessionDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    // Load sql.js WebAssembly
    // Check if DB file exists → load it
    // If not, check for sessions.json → migrate
    // Create schema if needed
  }

  async close(): Promise<void> {
    // Save database to file
    // Close connection
  }

  // CRUD Operations
  getAllSessions(): CockpitSession[]
  getSessionsByTaskId(taskId: string): CockpitSession[]
  getSessionById(id: string): CockpitSession | null
  getSessionByTerminalId(terminalId: string): CockpitSession | null
  insertSession(session: CockpitSession): void
  updateSession(id: string, updates: Partial<CockpitSession>): boolean
  deleteSession(id: string): boolean
  deleteByTaskId(taskId: string): number
  deleteOlderThan(date: Date): number
}
```

### Step 2: Implement Schema Creation

**Method**: `private createSchema()`

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastActive TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'closed')),
  terminalName TEXT NOT NULL,
  terminalId TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_taskId ON sessions(taskId);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_terminalId ON sessions(terminalId);
CREATE INDEX IF NOT EXISTS idx_sessions_lastActive ON sessions(lastActive);
```

### Step 3: Implement Migration Utility

**Method**: `private async migrateFromJson(jsonPath: string)`

1. Read `sessions.json` file
2. Parse and validate each session
3. Insert all valid sessions into SQLite
4. Rename `sessions.json` to `sessions.json.backup.{timestamp}`
5. Log migration summary

### Step 4: Implement CRUD Operations

Each method should:
- Use prepared statements for SQL injection safety
- Return appropriate types matching existing SessionManager API
- Handle errors gracefully with logging

### Step 5: Implement Persistence

**Method**: `private saveToFile()`

sql.js operates in-memory. After each write operation, export the database to a Uint8Array and write to disk:

```typescript
const data = this.db.export();
fs.writeFileSync(this.dbPath, Buffer.from(data));
```

Consider debouncing writes for performance.

## Acceptance Criteria

- [ ] sql.js dependency installed and types available
- [ ] SessionDatabase class created with all methods
- [ ] Schema created with proper indexes
- [ ] Migration from sessions.json works correctly
- [ ] All CRUD operations work correctly
- [ ] Database persists to disk after writes
- [ ] Error handling for all edge cases

## Testing

1. Create a test that:
   - Initializes database with no prior data
   - Inserts a session
   - Queries it back
   - Updates it
   - Deletes it

2. Create a migration test:
   - Create a mock sessions.json
   - Run initialize()
   - Verify all sessions migrated
   - Verify backup file created

## Notes

- sql.js loads WebAssembly asynchronously - the `initialize()` method must be async
- The database is in-memory by default - must explicitly save to file
- Consider transaction support for batch operations (deleteByTaskId)
- Keep the interface simple - SessionManager will handle locking

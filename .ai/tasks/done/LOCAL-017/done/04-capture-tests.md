<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 04-capture-tests.md                                   ║
║ TASK: LOCAL-017                                                  ║
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

# Add Tests for Session Capture

## Objective

Create unit tests to verify the capture queue behaves correctly, especially under concurrent capture scenarios.

## Pre-Implementation

Ensure work items 01-02 are complete first.

Check if test infrastructure exists:
- Look for `vscode-extension/src/test/` directory
- Check `package.json` for test scripts

## Implementation Steps

### Step 1: Create test directory if needed

**Command**:
```bash
mkdir -p vscode-extension/src/test
```

### Step 2: Create capture queue test file

**File**: `vscode-extension/src/test/captureQueue.test.ts`

**Content**:
```typescript
import * as assert from 'assert';

// Mock session manager for testing
class MockSessionManager {
  private sessions: { id: string }[] = [];
  private callCount = 0;

  async getSessions() {
    this.callCount++;
    return [...this.sessions];
  }

  addSession(id: string) {
    this.sessions.push({ id });
  }

  getCallCount() {
    return this.callCount;
  }

  reset() {
    this.sessions = [];
    this.callCount = 0;
  }
}

// Simplified capture queue implementation for testing
function createCaptureQueue(sessionManager: MockSessionManager) {
  let captureQueue: Promise<string | null> = Promise.resolve(null);
  let captureCount = 0;

  const captureLatestSessionId = async (
    simulatedNewSession: string
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      captureQueue = captureQueue.then(async () => {
        captureCount++;
        const currentCapture = captureCount;

        // Simulate getting fresh sessions
        const sessions = await sessionManager.getSessions();
        const knownIds = new Set(sessions.map(s => s.id));

        // Simulate delay (Claude startup time)
        await new Promise(r => setTimeout(r, 10));

        // Check if session is new
        if (!knownIds.has(simulatedNewSession)) {
          // Register the session
          sessionManager.addSession(simulatedNewSession);
          resolve(simulatedNewSession);
        } else {
          resolve(null);
        }

        return simulatedNewSession;
      });
    });
  };

  return { captureLatestSessionId, getCaptureCount: () => captureCount };
}

describe('Capture Queue Tests', () => {
  let mockManager: MockSessionManager;

  beforeEach(() => {
    mockManager = new MockSessionManager();
  });

  it('should capture single session correctly', async () => {
    const { captureLatestSessionId } = createCaptureQueue(mockManager);

    const result = await captureLatestSessionId('session-1');

    assert.strictEqual(result, 'session-1');
    assert.strictEqual(mockManager.getCallCount(), 1);
  });

  it('should serialize concurrent captures', async () => {
    const { captureLatestSessionId } = createCaptureQueue(mockManager);

    // Start 3 captures concurrently
    const promises = [
      captureLatestSessionId('session-1'),
      captureLatestSessionId('session-2'),
      captureLatestSessionId('session-3'),
    ];

    const results = await Promise.all(promises);

    // All should succeed with unique sessions
    assert.strictEqual(results[0], 'session-1');
    assert.strictEqual(results[1], 'session-2');
    assert.strictEqual(results[2], 'session-3');

    // Sessions should be fetched 3 times (once per capture)
    assert.strictEqual(mockManager.getCallCount(), 3);
  });

  it('should not capture duplicate sessions', async () => {
    const { captureLatestSessionId } = createCaptureQueue(mockManager);

    // Pre-register a session
    mockManager.addSession('existing-session');

    // Try to capture the same session
    const result = await captureLatestSessionId('existing-session');

    // Should return null (session already known)
    assert.strictEqual(result, null);
  });

  it('should get fresh sessions for each capture', async () => {
    const { captureLatestSessionId } = createCaptureQueue(mockManager);

    // First capture
    const result1 = await captureLatestSessionId('session-1');

    // Second capture should see session-1 in known sessions
    const result2 = await captureLatestSessionId('session-1');

    assert.strictEqual(result1, 'session-1');
    assert.strictEqual(result2, null); // Already captured
    assert.strictEqual(mockManager.getCallCount(), 2);
  });
});
```

### Step 3: Add test script to package.json

**File**: `vscode-extension/package.json`

**Add** to scripts section:
```json
{
  "scripts": {
    "test": "node --test src/test/*.test.ts"
  }
}
```

Or if using Mocha:
```json
{
  "scripts": {
    "test": "mocha --require ts-node/register src/test/**/*.test.ts"
  }
}
```

### Step 4: Run tests

**Command**:
```bash
cd vscode-extension && npm test
```

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Test file exists at `vscode-extension/src/test/captureQueue.test.ts`
- [ ] Tests cover: single capture, concurrent capture, duplicate prevention
- [ ] Tests pass successfully
- [ ] Test demonstrates queue serialization behavior

## Testing

Run the test suite:
```bash
cd vscode-extension && npm test
```

All tests should pass.

## Notes

- These are unit tests with mocks, not integration tests
- Full integration testing requires manual testing with real Claude sessions
- Consider adding tests to CI pipeline in future

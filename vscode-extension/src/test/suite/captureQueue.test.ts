/**
 * Tests for Session Capture Queue
 *
 * These tests verify the capture queue serialization logic that prevents
 * race conditions when multiple terminals start Claude sessions simultaneously.
 *
 * The tests use a mock session manager to simulate the capture behavior
 * without requiring actual Claude sessions.
 */

import * as assert from 'assert';

/**
 * Mock session manager for testing capture queue behavior
 */
class MockSessionManager {
  private sessions: { id: string }[] = [];
  private callCount = 0;

  async getSessions(): Promise<{ id: string }[]> {
    this.callCount++;
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 5));
    return [...this.sessions];
  }

  addSession(id: string): void {
    this.sessions.push({ id });
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.sessions = [];
    this.callCount = 0;
  }
}

/**
 * Creates a capture queue with the same pattern as extension.ts
 * This simulates the fix for the session ID race condition.
 */
function createCaptureQueue(sessionManager: MockSessionManager) {
  let captureQueue: Promise<string | null> = Promise.resolve(null);
  const captureOrder: string[] = [];

  /**
   * Simulates captureLatestSessionIdImpl - the actual capture logic
   */
  const captureLatestSessionIdImpl = async (
    knownSessionIds: Set<string>,
    simulatedNewSession: string
  ): Promise<string | null> => {
    // Simulate polling delay (Claude startup time)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check if session is new
    if (!knownSessionIds.has(simulatedNewSession)) {
      // Register the session
      sessionManager.addSession(simulatedNewSession);
      captureOrder.push(simulatedNewSession);
      return simulatedNewSession;
    }

    return null;
  };

  /**
   * Queued capture function - same pattern as extension.ts fix
   */
  const captureLatestSessionId = async (
    simulatedNewSession: string
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      captureQueue = captureQueue.then(async () => {
        // Get FRESH known sessions at capture time
        const sessions = await sessionManager.getSessions();
        const knownSessionIds = new Set(sessions.map(s => s.id));

        const result = await captureLatestSessionIdImpl(knownSessionIds, simulatedNewSession);
        resolve(result);
        return result;
      });
    });
  };

  return {
    captureLatestSessionId,
    getCaptureOrder: () => [...captureOrder]
  };
}

// Test Suite: Capture Queue
describe('Capture Queue', () => {
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
    const { captureLatestSessionId, getCaptureOrder } = createCaptureQueue(mockManager);

    // Start 3 captures concurrently (simulating rapid task switching)
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

    // Captures should happen in order due to queue
    const order = getCaptureOrder();
    assert.deepStrictEqual(order, ['session-1', 'session-2', 'session-3']);

    // Sessions should be fetched 3 times (once per capture, fresh each time)
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

  it('should get fresh sessions for each capture (preventing race condition)', async () => {
    const { captureLatestSessionId } = createCaptureQueue(mockManager);

    // First capture
    const result1 = await captureLatestSessionId('session-1');

    // Second capture should see session-1 in known sessions
    // This simulates the race condition fix - the second capture
    // gets fresh sessions and sees the first one was already captured
    const result2 = await captureLatestSessionId('session-1');

    assert.strictEqual(result1, 'session-1'); // First capture succeeds
    assert.strictEqual(result2, null); // Second capture sees it's already known
    assert.strictEqual(mockManager.getCallCount(), 2); // Fresh fetch each time
  });

  it('should handle many concurrent captures without cross-contamination', async () => {
    const { captureLatestSessionId, getCaptureOrder } = createCaptureQueue(mockManager);

    // Simulate rapid task switching - 10 tasks starting Claude simultaneously
    const sessionIds = Array.from({ length: 10 }, (_, i) => `session-${i}`);
    const promises = sessionIds.map(id => captureLatestSessionId(id));

    const results = await Promise.all(promises);

    // All should succeed with correct sessions
    results.forEach((result, i) => {
      assert.strictEqual(result, `session-${i}`);
    });

    // Order should be preserved
    const order = getCaptureOrder();
    assert.deepStrictEqual(order, sessionIds);
  });
});

// Test Suite: Without Queue (demonstrating the bug)
describe('Without Queue (demonstrating race condition)', () => {
  let mockManager: MockSessionManager;

  beforeEach(() => {
    mockManager = new MockSessionManager();
  });

  it('should demonstrate race condition with stale knownSessionIds', async () => {
    // This test demonstrates the OLD behavior (the bug)
    // When knownSessionIds is captured ONCE at terminal creation,
    // concurrent captures can grab each other's sessions

    // Capture knownSessionIds ONCE (the bug)
    const staleKnownSessionIds = new Set<string>();

    // Simulate concurrent captures with stale snapshot
    const captureWithStaleSessions = async (sessionId: string): Promise<string | null> => {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

      // Using stale knownSessionIds - this is the bug!
      if (!staleKnownSessionIds.has(sessionId)) {
        mockManager.addSession(sessionId);
        return sessionId;
      }
      return null;
    };

    // Both captures use the SAME stale knownSessionIds
    const promises = [
      captureWithStaleSessions('session-1'),
      captureWithStaleSessions('session-1'), // Same session ID - simulating race
    ];

    const results = await Promise.all(promises);

    // BUG: Both might succeed because neither sees the other's session
    // In the real scenario, one task would grab the other's session
    // The fix (queue + fresh sessions) prevents this
    const successCount = results.filter(r => r !== null).length;

    // This demonstrates that without the fix, duplicates can occur
    // (In reality the race is more subtle, but this shows the concept)
    console.log(`Race condition demo: ${successCount} captures succeeded for same session`);
  });
});

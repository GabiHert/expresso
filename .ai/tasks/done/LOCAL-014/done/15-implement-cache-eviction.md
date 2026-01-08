<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 15-implement-cache-eviction.md                        ║
║ TASK: LOCAL-014                                                  ║
║ SEVERITY: SUGGESTION                                             ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Implement Cache Eviction in CommentManager

## Objective

Add cache eviction mechanism to prevent unbounded memory growth in the CommentManager cache.

## File

`vscode-extension/src/services/CommentManager.ts` - cache management

## Problem

The `cache` Map in CommentManager grows without bounds. If a user opens many different tasks over time, the cache will keep growing and consuming memory. There's no eviction strategy.

## Implementation

Add LRU-style cache eviction:

```typescript
private readonly MAX_CACHE_SIZE = 50;
private readonly cacheAccessOrder: string[] = [];

private updateCacheAccess(taskId: string): void {
  // Remove existing entry
  const index = this.cacheAccessOrder.indexOf(taskId);
  if (index !== -1) {
    this.cacheAccessOrder.splice(index, 1);
  }
  // Add to end (most recent)
  this.cacheAccessOrder.push(taskId);

  // Evict oldest entries if over limit
  while (this.cacheAccessOrder.length > this.MAX_CACHE_SIZE) {
    const oldest = this.cacheAccessOrder.shift()!;
    this.cache.delete(oldest);
    this.cleanupWatcher(oldest);
  }
}

// Call updateCacheAccess when reading/writing cache:
async loadFeedback(taskId: string): Promise<FeedbackFile | null> {
  // Check cache first
  if (this.cache.has(taskId)) {
    this.updateCacheAccess(taskId);
    return this.cache.get(taskId)!;
  }
  // ... rest of method ...

  // After loading:
  this.cache.set(taskId, feedback);
  this.updateCacheAccess(taskId);
  return feedback;
}
```

## Acceptance Criteria

- [ ] Add MAX_CACHE_SIZE constant (50 tasks)
- [ ] Track access order for LRU eviction
- [ ] Evict oldest entries when cache exceeds limit
- [ ] Clean up watchers for evicted tasks
- [ ] No unbounded memory growth


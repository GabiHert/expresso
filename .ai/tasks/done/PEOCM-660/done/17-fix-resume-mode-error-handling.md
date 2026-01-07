<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 17-fix-resume-mode-error-handling.md                  ║
║ TASK: PEOCM-660                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                 ║
║ 2. Update status.yaml with new status                           ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml              ║
║ 5. Update task README with any learnings                        ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: backend
---

# Fix handleResumeMode Error Handling

## Objective

Fix the 500 error that occurs when calling POST `/admin/peo/tech_ops/entity_transfer` with a non-existent `transferItemId`. Currently returns "Invalid status code: undefined" instead of a proper 404 Not Found.

## Bug Details

**Current behavior**:
```
RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code: undefined
    at TechOpsAdminController.handleResumeMode (tech_ops.ts:275)
```

**Expected behavior**:
```json
{"message": "Transfer item not found: {id}", "httpCode": 404}
```

**Root cause**: `handleResumeMode` is a private method with a custom-typed `res` parameter that bypasses Express's type system, causing `res.status()` to fail.

## Implementation Steps

### Step 1: Refactor handleResumeMode

**File**: `backend/controllers/admin/peo/tech_ops.ts`

**Current signature** (around line 420):
```typescript
private async handleResumeMode(
    body: {...},
    res: {status: (code: number) => {json: (data: unknown) => void}},
    ...
): Promise<...>
```

**Change to**: Remove `res` parameter entirely. Make this a pure data-loading method that throws errors instead of sending responses.

```typescript
private async handleResumeMode(
    body: {...},
    // Remove res parameter
    ...
): Promise<TransferItemWithTransfer> // Return data or throw
```

### Step 2: Update handleResumeMode Implementation

Remove the `res.status().json()` calls inside `handleResumeMode`. Instead:

1. If transfer item not found, **throw an error** with appropriate details:
```typescript
if (!result) {
    const error = new Error(`Transfer item not found: ${body.transferItemId}`);
    (error as any).statusCode = HTTP_CODES.notFound;
    throw error;
}
```

2. Return the loaded data on success (don't send response here)

### Step 3: Update executeEntityTransfer

**File**: `backend/controllers/admin/peo/tech_ops.ts`

In the `executeEntityTransfer` method, update the call to `handleResumeMode`:

```typescript
try {
    if (isResumeMode) {
        const transferItem = await this.handleResumeMode(body, ...);
        // Continue processing with transferItem
        // Send response here with proper Express res object
    }
    // ... rest of implementation
} catch (error) {
    // Handle errors uniformly
    const statusCode = error.statusCode || HTTP_CODES.internalServerError;
    return res.status(statusCode).json({
        message: error.message,
        name: error.name,
        httpCode: statusCode
    });
}
```

### Step 4: Follow Existing Pattern

Reference working endpoints for error handling pattern:

**GET `/entity_transfer/item/:id`** (lines 248-264):
```typescript
try {
    const response = await entityTransferClientService.getTransferItemById(id);
    return res.status(HTTP_CODES.ok).json(response);
} catch (error) {
    const err = error as {response?: {status?: number; data?: unknown}};
    if (err.response?.data) {
        const statusCode = err.response.status || HTTP_CODES.notFound;
        return res.status(statusCode).json(err.response.data);
    }
    throw error;
}
```

## Acceptance Criteria

- [ ] POST with non-existent `transferItemId` returns HTTP 404
- [ ] Response body: `{"message": "Transfer item not found: {id}", "httpCode": 404}`
- [ ] No stack trace exposed to client
- [ ] Valid resume mode (existing item) still works correctly
- [ ] TypeScript compiles without errors

## Testing

### Manual Test

```bash
# Should return 404, not 500
curl -X POST 'https://.../admin/peo/tech_ops/entity_transfer' \
  -H 'Content-Type: application/json' \
  -H 'x-auth-token: ...' \
  -d '{"transferItemId": "00000000-0000-0000-0000-000000000000"}'
```

### Expected Response
```json
{
  "message": "Transfer item not found: 00000000-0000-0000-0000-000000000000",
  "httpCode": 404
}
```

## Notes

- This bug was discovered during end-to-end testing (work item 09)
- The fix follows the existing error handling pattern used in other endpoints
- No changes needed in PEO service - this is backend-only

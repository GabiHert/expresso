<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 16-fix-type-guard-validation.md                       ║
║ TASK: LOCAL-014                                                  ║
║ SEVERITY: SUGGESTION                                             ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: vscode-extension
---

# Fix Type Guard for Message Validation

## Objective

Improve type guard for webview message validation to properly validate message structure at runtime.

## File

`vscode-extension/src/panels/DiffReviewPanel.ts` - message handling

## Problem

The message handler uses type casting without proper runtime validation. Messages from the webview could have unexpected shapes that don't match the TypeScript types, leading to runtime errors.

## Implementation

Add proper runtime validation for incoming messages:

```typescript
interface WebviewMessage {
  type: string;
  [key: string]: unknown;
}

interface AddCommentMessage extends WebviewMessage {
  type: 'addComment';
  line: number;
  text: string;
}

interface ResolveCommentMessage extends WebviewMessage {
  type: 'resolveComment';
  id: string;
}

// Type guards
function isAddCommentMessage(msg: WebviewMessage): msg is AddCommentMessage {
  return (
    msg.type === 'addComment' &&
    typeof msg.line === 'number' &&
    typeof msg.text === 'string'
  );
}

function isResolveCommentMessage(msg: WebviewMessage): msg is ResolveCommentMessage {
  return (
    msg.type === 'resolveComment' &&
    typeof msg.id === 'string'
  );
}

// In message handler:
this._panel.webview.onDidReceiveMessage(
  async (message: unknown) => {
    // Validate base structure
    if (!message || typeof message !== 'object' || !('type' in message)) {
      console.error('Invalid message received:', message);
      return;
    }

    const msg = message as WebviewMessage;

    switch (msg.type) {
      case 'addComment':
        if (!isAddCommentMessage(msg)) {
          console.error('Invalid addComment message:', msg);
          return;
        }
        // Now msg is properly typed
        await this.handleAddComment(msg.line, msg.text);
        break;

      case 'resolveComment':
        if (!isResolveCommentMessage(msg)) {
          console.error('Invalid resolveComment message:', msg);
          return;
        }
        await this.handleResolveComment(msg.id);
        break;

      // ... other cases ...
    }
  },
  null,
  this._disposables
);
```

## Acceptance Criteria

- [ ] Define message interfaces for each message type
- [ ] Create type guard functions with runtime validation
- [ ] Validate messages before processing
- [ ] Log invalid messages for debugging
- [ ] No runtime errors from malformed messages


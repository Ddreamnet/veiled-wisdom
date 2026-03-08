

# Fix: Platform-Specific FCM Messages & Short APNs Collapse ID

## Problem
`apns-collapse-id` header has a 64-byte limit. Current key `chat_${conversationId}_${recipientId}` exceeds this.

## Solution

### 1. Add helper to shorten collapse IDs
Strip dashes from UUID to create short keys:
```typescript
function shortId(uuid: string): string {
  return uuid.replace(/-/g, "");
}
```

### 2. Platform-specific message building in `handleChatMessage`
Instead of sending one message with both `android` and `apns` blocks, check `device.platform` and build accordingly:

- **Android**: include `android` block only (tag + collapse_key using full `chat_${conversationId}`)
- **iOS**: include `apns` block only with shortened `apns-collapse-id`: `c_${shortId(conversationId)}` (max ~37 bytes, well under 64)

### 3. Apply same pattern to `handlePaymentRequest` and `handleTeacherApproval`
These don't have the collapse-id issue but should follow the same platform-split pattern for correctness (no apns block sent to Android, no android block sent to iOS).

### Changes (single file)
**`supabase/functions/send-push-notification/index.ts`**

- Add `shortId()` helper function
- Add `buildPlatformMessage()` helper that takes base notification + platform-specific configs and returns the right message based on `device.platform`
- In `handleChatMessage`: split Android/iOS message construction
  - Android: `tag: chat_${conversationId}`, `collapse_key: chat_${conversationId}`
  - iOS: `apns-collapse-id: c_${shortId(conversationId)}`, `thread-id: c_${shortId(conversationId)}`
- In `handlePaymentRequest` and `handleTeacherApproval`: same platform split

### After code change
User needs to redeploy the function via Dashboard (copy-paste updated code).


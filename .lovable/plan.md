

# Video Call Overlay Bug Fix Plan

## Problem Summary
The second participant successfully joins Daily (logs confirm "Joined meeting"), but the UI stays on "Görüşme hazırlanıyor…" loading screen.

## Root Cause Analysis

### The State Architecture
There are **two separate state systems** that are out of sync:

1. **Parent Component (VideoCall page):**
   - `isLoading` → Controls "Görüşme hazırlanıyor…" overlay (lines 1179-1208)
   - Set to `false` at line 1048 after `createRoom()` returns

2. **Child Component (CallUI):**
   - `callState` → Controls "Görüşme başlatılıyor..." loading screen (lines 776-778)
   - Initialized as `'loading'` (line 666)
   - Set to `'joined'` only via `joined-meeting` event handler (line 698)

### The Race Condition
```text
Timeline:
────────────────────────────────────────────────────────────────────
1. createRoom() succeeds
2. Daily.createCallObject() called (line 1044)
3. setCallObject(call) → triggers render (line 1047)
4. setIsLoading(false) → hides parent overlay (line 1048)
5. CallUI mounts with callState='loading'
6. CallUI registers 'joined-meeting' handler (line 744)
7. call.join() starts (line 1096)
8. ... Daily API round-trip ...
9. 'joined-meeting' event fires
10. BUT: If step 9 fires BEFORE step 6 completes → handler not registered yet
────────────────────────────────────────────────────────────────────
```

### Critical Missing Logic
CallUI never checks the **current** meeting state on mount. It only listens for **future** `joined-meeting` events. If the meeting is already joined when CallUI mounts, the overlay stays visible forever.

---

## Solution Design

### Fix 1: Check Meeting State on Mount in CallUI

Add logic to query Daily's current meeting state immediately when CallUI mounts:

```typescript
// In CallUI's useEffect that registers event handlers
useEffect(() => {
  // Check CURRENT meeting state immediately on mount
  const currentState = callObject.meetingState();
  console.log('[CallUI] Initial meeting state:', currentState);
  
  if (currentState === 'joined-meeting') {
    console.log('[CallUI] Already joined - transitioning callState to joined');
    setCallState('joined');
    updateParticipants();
  } else if (currentState === 'joining-meeting') {
    setCallState('joining');
  }
  
  // Then register handlers for future state changes
  // ... existing handler registration
}, [callObject, ...]);
```

### Fix 2: Add Debug Logging for State Transitions

```typescript
// Log every callState transition
useEffect(() => {
  console.log('[CallUI] callState transition:', callState);
}, [callState]);

// Log overlay visibility conditions
console.log('[CallUI] Overlay visible:', { 
  callState, 
  isLoadingOrJoining: callState === 'loading' || callState === 'joining' 
});
```

### Fix 3: Handle "joining-meeting" Event

Daily fires `joining-meeting` before `joined-meeting`. Add handler:

```typescript
const handleJoiningMeeting = () => {
  console.log('[CallUI] joining-meeting event fired');
  setCallState('joining');
};

callObject.on('joining-meeting', handleJoiningMeeting);
```

### Fix 4: Deduplicate Intent Handling

Ensure second user's click (even with `intent=start`) correctly recognizes an active call:

```typescript
// In createRoom response handling
if (roomData.reused || roomData.active_call) {
  console.log('[VideoCall] Active call detected, treating as join');
  // No special action needed, edge function returns existing room
}
```

---

## Files to Modify

### 1. `src/pages/VideoCall.tsx`

**Changes:**

| Location | Change |
|----------|--------|
| Line 666 | Keep initial state as 'loading' |
| Lines 695-759 | Add `meetingState()` check on mount |
| Lines 695-759 | Add `joining-meeting` event handler |
| Lines 695-759 | Add debug logging for state transitions |
| Lines 776-778 | No change needed (condition is correct) |

---

## Technical Details

### Daily.js Meeting States
Daily exposes `callObject.meetingState()` which returns:
- `'new'` - call object created but not joined
- `'joining-meeting'` - join in progress
- `'joined-meeting'` - successfully joined
- `'left-meeting'` - left the room
- `'error'` - error state

### Why This Fixes the Bug
1. On mount, CallUI immediately checks if already joined → transitions to 'joined'
2. Event handlers catch future state changes for new joins
3. No gap where the overlay can stay visible despite being joined
4. Debug logs make future regressions easy to diagnose

---

## Verification Checklist

After implementation:

1. **User A starts call** → sees self-preview in WaitingRoom
2. **User B joins same call** → should NOT see "Görüşme hazırlanıyor" for more than 1-2 seconds
3. **Console shows:** `[CallUI] Initial meeting state: joined-meeting` or `[CallUI] callState transition: joined`
4. **Both users** see each other's video tiles
5. **Double-mount protection** still works (no duplicate room creation)


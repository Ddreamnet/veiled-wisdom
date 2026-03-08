
# Video Call Refactoring Plan

I have reviewed the video calling code (`src/pages/VideoCall`, `src/hooks/video-call`, etc.). A previous refactoring effort began extracting modular hooks into `src/hooks/video-call/`, but **never fully integrated them**. `CallUI.tsx` still contains inline, duplicated versions of this logic. 

I propose a safe, incremental 3-phase refactoring plan that consolidates this logic, strictly preserving all current behavior, timing, event flows, and UX.

---

### Phase 1: Consolidate `CallUI.tsx` Hooks (Low Risk, High Impact)
*Problem: `CallUI.tsx` (765 lines) contains inline implementations of logic that already exists in `src/hooks/video-call/`.*
*   **Remove Inline Utilities**: Remove the inline `useNotifications` and `useCallTimers` functions from the top of `CallUI.tsx`.
*   **Wire Extracted Hooks**: Connect the previously extracted `useCallNotifications`, `useCallTimers`, `useMediaControls`, and `useParticipants` hooks into `CallUI.tsx`.
*   **State Deduplication**: Replace the inline `isCameraOn`, `isMicOn`, `toggleCamera`, and `toggleMic` state and logic with the `useMediaControls` hook. Replace `updateParticipants` and `participants` state with `useParticipants`.
*   **Result**: Removes ~200 lines of duplicated code from `CallUI.tsx` without touching underlying Daily API logic.

### Phase 2: Extract `useDailyEvents` Orchestration (Medium Risk)
*Problem: `CallUI.tsx` has a massive 160-line `useEffect` dedicated to binding and unbinding Daily event listeners, tracking track transitions, and updating UI state.*
*   **Extract Hook**: Create `src/hooks/video-call/useDailyEvents.ts`.
*   **Encapsulate Listeners**: Move the `joining-meeting`, `joined-meeting`, `participant-joined/left`, and `track-started/stopped` handlers into this hook.
*   **Preserve Safeguards**: Ensure the module-level `globalTrackStates` and debounce mechanisms remain exactly as they are to prevent UI flickering and handle React StrictMode double-mounts.
*   **Result**: `CallUI.tsx` becomes strictly a UI rendering layer, deeply improving readability.

### Phase 3: Extract `useCallInitialization` from `VideoCallPage.tsx` (Medium Risk)
*Problem: `VideoCallPage.tsx` (458 lines) mixes complex API interactions, mutex mapping, media permission gates, Edge Function invocations, and database sync with React rendering.*
*   **Extract Initialization Flow**: Move the `createRoom`, `initializeCall`, and Mutex management (`initFlowMutex`, `createRoomMutex`) into a new `src/hooks/video-call/useCallInitialization.ts` hook.
*   **Simplify Component**: Refactor `VideoCallPage.tsx` so it only reads state (`isLoading`, `error`, `callObject`) from the hook and renders the appropriate screen (`LoadingScreen`, `ErrorScreen`, or `CallUI`).
*   **Result**: Pure separation of concerns between WebRTC/Daily initialization mechanics and component rendering.

---

This incremental approach safely completes the existing modularization pattern while removing dead duplicates. No visual UI, user flows, UI bounds, or database operations will be modified.

Please approve this plan, or let me know if you would like to adjust the priorities.

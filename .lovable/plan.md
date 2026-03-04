

# Chat UI Premium Redesign Plan

## Scope
Improve message bubbles, time/check indicators, audio message player, and recording UI. Keep dark purple background, input area, icons, and theme colors unchanged.

---

## 1. Message Bubbles (MessageList.tsx)

**Own messages (right):**
- Keep `bg-gradient-to-br from-primary to-primary/90` but add a subtle lighter stop: `from-primary via-primary to-primary/85` for depth
- Add `shadow-md shadow-primary/10` for a soft glow
- Increase corner radius consistency: `rounded-[20px] rounded-tr-md`
- Text: bump to `text-[15px] leading-relaxed font-[420]` (slightly heavier than 400, lighter than 500) with `text-white` forced instead of relying on `text-primary-foreground`
- Add `drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]` on the text `<p>` to ensure white text never blends with lighter gradient areas

**Received messages (left):**
- Change from `bg-muted` to `bg-muted/80 border border-border/40` for subtle definition
- Same radius update: `rounded-[20px] rounded-tl-md`
- Same text size bump

**Time + checkmarks (both sides):**
- Move time and checkmarks INSIDE the bubble (bottom-right for own, bottom-left for received) instead of below it
- Shrink to `text-[10px]` and `h-3 w-3` for checks
- Use `text-white/60` for own messages, `text-muted-foreground/60` for received
- This is the key "premium" pattern (WhatsApp/Telegram style inline timestamps)

---

## 2. Audio Message Player (AudioMessage.tsx)

**Bubble styling:**
- Match new bubble radius and shadow from above
- Waveform bars: use `useMemo` with a seeded random (based on audioUrl hash) so bars don't re-randomize on every render
- Own message: bars active = `bg-white`, inactive = `bg-white/25`
- Received: bars active = `bg-primary`, inactive = `bg-muted-foreground/25`
- Play button: slightly smaller `h-10 w-10`, cleaner circle with `border` instead of just bg opacity
- Duration text inside bubble, same `text-[10px]` as message timestamps

---

## 3. Recording UI (MessageInput.tsx)

**Recording state:**
- Replace `bg-destructive/10` with a sleeker dark card: `bg-card/80 backdrop-blur-sm border border-destructive/30`
- Red dot: keep pulse, remove the double-layered ping (too noisy) — single `animate-pulse` dot
- Timer: slightly larger `text-sm font-mono tabular-nums`
- Buttons: keep as-is, just tighten gap

**Recorded state (preview before send):**
- Replace native `<audio controls>` with a mini version of the AudioMessage waveform player — same visual language
- This creates consistency: the preview looks like what the recipient will see

---

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/chat/MessageList.tsx` | Bubble styles, inline timestamps, text improvements |
| `src/components/chat/AudioMessage.tsx` | Stable waveform, refined styling, consistent with bubbles |
| `src/components/chat/MessageInput.tsx` | Recording UI cleanup, replace native audio with mini player |

3 files total. No structural changes, pure styling refinement.


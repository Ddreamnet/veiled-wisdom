

# Site-Wide Performance & Cleanup Implementation Plan

## Overview

Based on the approved audit, here is the concrete implementation plan. The previous round already deleted dead pages, unused hooks, and no-op utilities. What remains are targeted optimizations to the homepage, shared components, and CSS layer.

---

## Step 1: Remove `App.css` (Dead Vite Boilerplate)

**File:** `src/App.css` — 42 lines of default Vite template styles (`.logo`, `.read-the-docs`, `logo-spin`). None of these classes are used anywhere. Delete the file and remove the `import './App.css'` from `App.tsx`.

---

## Step 2: Card Component — Remove `backdrop-blur-sm` and `hover-lift`

**File:** `src/components/ui/card.tsx`

The base `Card` applies `backdrop-blur-sm` and `hover-lift` (which sets `will-change: transform`) to **every** card globally. Most cards don't need blur, and `will-change` on hundreds of cards wastes GPU memory.

- Remove `backdrop-blur-sm` and `hover-lift` from the base Card class
- Keep `shadow-elegant` (it's cheap)
- Pages that need hover effects already apply `card-hover` explicitly

---

## Step 3: Replace `transition-all` Across Components

**Files:** ~24 files with 276 occurrences

Replace `transition-all` with specific property transitions in high-frequency components:

- `Header.tsx` nav links: `transition-all` → `transition-colors`
- `Header.tsx` buttons: `transition-all` → `transition-[transform,box-shadow]`
- `ExpertsCarousel.tsx` slides: `transition-all` → `transition-[transform,opacity]` and `transition-[border-color,box-shadow]`
- `MobileBottomNav.tsx` items: already mostly correct, just clean up line 299
- `Footer.tsx` social icons: `transition-all` → `transition-[background-color,border-color,transform]`
- Static pages (`Contact.tsx`, `HowItWorks.tsx`, `FAQ.tsx`): `transition-all` → `transition-colors`
- `ConversationList.tsx`: `transition-all` → `transition-colors`

Skip: `toast.tsx` and `sidebar.tsx` (Radix UI internals, leave as-is).

---

## Step 4: Console.log Cleanup

**Files:** `src/lib/messageHelpers.ts`, `src/hooks/useActiveCall.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/auth/teacherApproval.ts`, `src/contexts/auth/roleHelpers.ts`, `src/components/chat/ChatWindow.tsx`

Replace bare `console.log` calls with `devLog()` from `src/lib/debug.ts`. This silences all logs in production builds automatically. ~20 remaining occurrences across 6 files.

---

## Step 5: Homepage Hero Performance

**File:** `src/pages/Index.tsx`

- The parallax scroll listener runs on every scroll event even after the hero is off-screen. Add an `IntersectionObserver` to disable parallax when the hero section is not visible.
- The `{!user}` on line 263 renders nothing — remove the empty expression.

---

## Step 6: Remove `supabaseAnonKeyPublic` Alias

**File:** `src/lib/supabase.ts`

The alias is used in exactly one place (`useCallTermination.ts`). Replace that import with the direct `supabaseAnonKey` approach — but since the anon key is already embedded in the client, we can just import the key directly. Actually, since `supabaseAnonKeyPublic` is a trivial alias and has exactly 1 consumer, just keep it (zero risk, zero benefit to remove). **Skip this step** — not worth the churn.

---

## Step 7: Remove Unused CSS Animations

**File:** `src/index.css`

- `glow-pulse` keyframe (lines 300-303): search shows zero usage → delete
- `skeleton-shimmer` and `.skeleton-shimmer` (lines 364-384): search for usage first, likely unused since Tailwind's built-in skeleton animation is used via the Skeleton component
- `skeleton-wave` and `.skeleton-wave` (lines 386-407): same — likely unused

---

## Summary of Files to Change

| File | Action |
|------|--------|
| `src/App.css` | **Delete** |
| `src/App.tsx` | Remove `import './App.css'` |
| `src/components/ui/card.tsx` | Remove `backdrop-blur-sm hover-lift` from base |
| `src/index.css` | Remove unused keyframes/classes |
| `src/pages/Index.tsx` | Add IO guard for parallax, remove `{!user}` |
| `src/components/Header.tsx` | `transition-all` → `transition-colors` |
| `src/components/ExpertsCarousel.tsx` | `transition-all` → specific properties |
| `src/components/Footer.tsx` | `transition-all` → specific properties |
| `src/components/mobile/MobileBottomNav.tsx` | `transition-all` → specific |
| `src/pages/static/Contact.tsx` | `transition-all` → `transition-colors` |
| `src/pages/static/HowItWorks.tsx` | `transition-all` → `transition-colors` |
| `src/components/chat/ConversationList.tsx` | `transition-all` → `transition-colors` |
| `src/lib/messageHelpers.ts` | `console.log` → `devLog` |
| `src/hooks/useActiveCall.ts` | `console.log` → `devLog` |
| `src/contexts/AuthContext.tsx` | `console.log` → `devLog` |
| `src/contexts/auth/teacherApproval.ts` | `console.log` → `devLog` |
| `src/contexts/auth/roleHelpers.ts` | `console.log` → `devLog` |
| `src/components/chat/ChatWindow.tsx` | `console.log` → `devLog` |

Total: ~18 files, focused on performance-impacting changes with zero visual regression.


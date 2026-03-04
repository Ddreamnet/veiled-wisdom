

# Codebase Architecture Audit -- Detailed Report

## Executive Summary

The codebase follows reasonable patterns overall (centralized routing, domain-driven queries, lazy loading). However, there are significant issues: duplicate page files that bypass modular folders, dead/no-op utility code, excessive `console.log` in production paths, and inconsistent hook naming. Below are all findings ranked by impact.

---

## CRITICAL: Duplicate Page Files

The most serious architectural issue. Several pages exist BOTH as a monolithic root file AND as a modular folder, creating confusion about which is actually used.

| Root File (monolith) | Modular Folder | Lines | Which is loaded? |
|---|---|---|---|
| `src/pages/ListingDetail.tsx` | `src/pages/ListingDetail/` | 680 vs 485 | **Root file** (routeConfig imports `../pages/ListingDetail/index` which re-exports `ListingDetailPage.tsx`) |
| `src/pages/Profile.tsx` | `src/pages/Profile/` | 644 vs 152 | **Root file** (routeConfig imports `../pages/Profile/index` which re-exports `ProfilePage.tsx`) |

**Problem:** `routeConfig.ts` imports `ListingDetail/index` and `Profile/index`, which correctly point to the modular versions. But the ROOT files (`ListingDetail.tsx`, `Profile.tsx`) still exist at 680 and 644 lines respectively -- they are **dead code** that will confuse any developer and bloat the repo.

**Action:** Delete `src/pages/ListingDetail.tsx` (680 lines) and `src/pages/Profile.tsx` (644 lines).

---

## HIGH: Dead Utility Code

### 1. `useMousePosition.tsx` -- Zero consumers
The hook exists but is imported nowhere. Index.tsx replaced it with inline ref-based logic. **Delete the file.**

### 2. `useScrollPosition.tsx` -- Zero consumers
Same situation. Header.tsx has its own inline scroll detection. **Delete the file.**

### 3. `routePrefetch.ts` -- Effectively a no-op
`prefetchRoute()` is explicitly disabled (comment says "causes 404 errors"). `prefetchCriticalRoutes()` calls it anyway, doing nothing. The only real function is `preconnectDomains()` which is never called. `App.tsx` calls `prefetchCriticalRoutes()` on mount -- this is wasted code.

**Action:** Either implement real prefetching (e.g., trigger lazy component imports) or delete the file and remove the call from `App.tsx`.

### 4. `imageOptimizer.ts` -- All functions return the original URL unchanged
Every function is a passthrough. The file provides zero optimization. It adds import overhead and false confidence.

**Action:** Either implement actual Supabase Image Transformation parameters or remove the indirection and use raw URLs directly.

### 5. `imageCache.ts` -- Redundant with browser cache
The custom `Map<string, string>` maps URLs to themselves. The browser already caches images via HTTP headers. The `preloadImage` function creates an `Image()` element to trigger a fetch -- this is the only useful part, but it stores `src -> src` which is pointless.

**Action:** Simplify to just the preload trigger without the fake cache map.

---

## HIGH: Type Definitions in Wrong Location

`src/lib/supabase.ts` contains **95 lines of type definitions** (Profile, Category, Listing, Appointment, etc.) mixed with the Supabase client initialization. These types are domain models used across the entire app.

**Action:** Extract types into `src/lib/types.ts` or `src/types/database.ts`. Keep `supabase.ts` focused on client configuration only.

---

## MEDIUM: Excessive Console Logging in Production Paths

161 `console.log` calls found across 10 files. Key offenders:

- `src/pages/Messages.tsx` -- 6 console.logs in normal flow (not debug)
- `src/hooks/useConversations.ts` -- 7 console.logs in `getOrCreateConversation`
- `src/hooks/useMessages.ts` -- console.logs in realtime subscription
- `src/contexts/AuthContext.tsx` -- 6 console.logs in auth state changes

These are not wrapped in `devLog()` despite `src/lib/debug.ts` providing exactly that utility.

**Action:** Replace all bare `console.log` calls with `devLog()` from `src/lib/debug.ts`, or remove them entirely.

---

## MEDIUM: Duplicate Hook Files (Naming Legacy)

Two pairs of hook files exist for backward compatibility:

- `src/hooks/use-mobile.tsx` + `src/hooks/useMobile.tsx`
- `src/hooks/use-toast.ts` + `src/hooks/useToast.ts`

Per the project's own naming convention, only camelCase versions should exist.

**Action:** Update all imports to use camelCase versions, then delete the kebab-case files.

---

## MEDIUM: Breadcrumb Component Sprawl

Three separate breadcrumb components exist:
- `src/components/AdminBreadcrumb.tsx`
- `src/components/PageBreadcrumb.tsx`
- `src/components/UnifiedBreadcrumb.tsx`

**Action:** Audit usage. If `UnifiedBreadcrumb` was meant to replace the others, complete the migration and remove the old ones.

---

## LOW: `src/lib/supabase.ts` exports `supabaseAnonKeyPublic`

Line 7: `export const supabaseAnonKeyPublic = supabaseAnonKey;` -- a redundant alias. The anon key is already public by nature.

**Action:** Remove the alias; update any consumers to use `supabaseUrl` + direct client calls.

---

## LOW: `App.tsx` inline components and hooks

`App.tsx` contains `useIsMobileLayout()`, `MobileHeaderWrapper`, `PageLoader`, and `renderRoute()` all inline. These should be in separate files:

- `PageLoader` -> `src/components/PageLoader.tsx`
- `useIsMobileLayout` -> `src/hooks/useIsMobileLayout.ts`

---

## LOW: `src/pages/teacher/MyListings/index.tsx` is misleading

```typescript
export { default } from '../MyListings';
```

This re-exports from the PARENT directory, not the folder's own files. The folder contains `components/`, `hooks/`, `types.ts` but the index bypasses them all. Either the modularization is incomplete or the folder structure is vestigial.

---

## Implementation Priority

| Step | Task | Files Affected | Risk |
|------|------|---------------|------|
| 1 | Delete dead duplicate pages | `Profile.tsx`, `ListingDetail.tsx` (root) | Low -- verify routes load correctly |
| 2 | Delete unused hooks | `useMousePosition.tsx`, `useScrollPosition.tsx` | None -- zero imports |
| 3 | Remove/fix no-op utilities | `routePrefetch.ts`, `imageOptimizer.ts`, `imageCache.ts` | Low |
| 4 | Extract types from supabase.ts | `supabase.ts` -> `types.ts` | Medium -- many imports to update |
| 5 | Replace console.log with devLog | ~10 files | Low |
| 6 | Consolidate duplicate hook files | `use-mobile`/`useMobile`, `use-toast`/`useToast` | Low -- update imports |
| 7 | Consolidate breadcrumb components | 3 breadcrumb files | Low |
| 8 | Extract inline components from App.tsx | `App.tsx` | Low |
| 9 | Fix MyListings folder structure | `teacher/MyListings/` | Medium |

Steps 1-3 are pure cleanup with zero risk. Steps 4-6 are safe refactors. Steps 7-9 require more careful migration.


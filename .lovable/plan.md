

# Site-Wide Codebase Refactoring Plan

## Priority 1: Duplicated ListingCard Component (High Impact)

**Files:** `src/pages/Index.tsx`, `src/pages/AllListings.tsx`, `src/pages/SubCategoryDetail.tsx`

**Problem:** The same listing card UI (cover image, teacher avatar, title, description, price) is copy-pasted across 3 files with identical markup. Any style change requires editing 3 places.

**Proposal:** Extract a shared `src/components/ListingCard.tsx` component. Define a `ListingCardData` type to replace the `any` typing. All three pages import and use the shared component.

**Risk:** Low. Pure presentational extraction. Visual output unchanged.

---

## Priority 2: Pervasive `any` Types (High Impact, Incremental)

**Files:** 36 files with 380+ occurrences of `: any`

**Key offenders:**
- `src/lib/queries/appointmentQueries.ts` — appointment rows, profile maps typed as `any[]`
- `src/pages/PublicProfile.tsx` — `listing: any`, `review: any` throughout
- `src/pages/Index.tsx` — `ListingCard({ listing }: { listing: any })`
- `src/pages/admin/Payments.tsx`, `Users.tsx` — error catches, data rows
- `src/App.tsx` — `renderRoute(route, user: any)`

**Proposal:** Define proper interfaces in `src/types/database.ts` (or colocated type files) for enriched query return types (e.g., `ListingWithProfile`, `AppointmentWithRelations`, `ReviewWithProfile`). Replace `any` incrementally, starting with the most-used query hooks.

**Risk:** Low per file. No runtime change. Improves IDE autocomplete and catches bugs at compile time.

---

## Priority 3: `Index.tsx` is Too Large (~400 lines, 5 sections)

**File:** `src/pages/Index.tsx` (404 lines)

**Problem:** Contains hero section, categories carousel, listings preview, curiosities grid, and experts carousel all in one file with inline sub-components (`ListingCard`, `ListingsSlider`, `CategoriesCarousel`). Complex parallax/scroll logic mixed with UI.

**Proposal:** 
- Extract `CategoriesCarousel` → `src/components/home/CategoriesCarousel.tsx`
- Extract `ListingsPreview` → `src/components/home/ListingsPreview.tsx`  
- Extract `CuriositiesSection` → `src/components/home/CuriositiesSection.tsx`
- Extract `HeroSection` → `src/components/home/HeroSection.tsx` (includes parallax refs)
- `Index.tsx` becomes a thin composition of these sections (~30 lines)

**Risk:** Low. Each section is already self-contained with clear data boundaries.

---

## Priority 4: `PublicProfile.tsx` Monolith (290 lines)

**File:** `src/pages/PublicProfile.tsx`

**Problem:** Single file with 3 inline components (`ListingCard`, `StatBadge`, page body), heavy JSX nesting, and `any` types throughout. Similar pattern to other pages that were already modularized (Profile, ListingDetail).

**Proposal:** Convert to folder structure following the existing pattern:
```text
src/pages/PublicProfile/
  index.tsx           (re-export)
  PublicProfilePage.tsx (main logic)
  components/
    ProfileHero.tsx
    ListingCard.tsx   (or use shared component from Priority 1)
    ReviewsGrid.tsx
```

**Risk:** Low. Follows established project pattern.

---

## Priority 5: Admin Pages Use Raw `useEffect`+`useState` Instead of React Query

**Files:** `src/pages/admin/Dashboard.tsx` (361 lines), `Users.tsx` (653 lines), `Payments.tsx` (497 lines), `Categories.tsx` (591 lines)

**Problem:** These pages manually manage loading/error state with `useState` + `useEffect` + raw Supabase calls, while the rest of the app uses React Query hooks. This means no automatic caching, no stale-while-revalidate, and inconsistent error handling patterns.

**Proposal:** Migrate each admin page's data fetching to dedicated React Query hooks under `src/lib/queries/adminQueries.ts`. This brings caching, automatic refetch, and consistent loading/error patterns. Can be done one page at a time.

**Risk:** Medium-low. Behavior changes slightly (cached data, background refetches). Test each page after migration.

---

## Priority 6: `Appointments.tsx` Uses Custom Breadcrumb Instead of UnifiedBreadcrumb

**File:** `src/pages/Appointments.tsx`

**Problem:** Manually constructs breadcrumb using raw `Breadcrumb` primitives (lines 99-113) instead of using the `UnifiedBreadcrumb` component that every other page uses. Inconsistent with the project standard documented in memory.

**Proposal:** Replace with `<UnifiedBreadcrumb customItems={[{ label: 'Randevularım' }]} />`.

**Risk:** Trivial. One-line change.

---

## Priority 7: `Settings.tsx` Notification Toggles Are Non-Functional

**File:** `src/pages/Settings.tsx`

**Problem:** Notification preference switches (lines 34-36) use local `useState` with no persistence. Toggling them does nothing. This is dead UI that misleads users.

**Proposal:** Either connect to a Supabase `user_preferences` table, or clearly mark the section as "Coming Soon" with disabled switches. Recommend the latter as a quick fix.

**Risk:** Low. UX improvement, no breakage.

---

## Priority 8: Listing Query Data-Enrichment Logic Duplicated

**File:** `src/lib/queries/listingQueries.ts`

**Problem:** The profile-map + price-map enrichment pattern (fetch listings → batch fetch profiles → batch fetch prices → merge) is duplicated between `useSubCategoryListings` (lines 39-70) and `useAllListings` (lines 95-127) — nearly identical code.

**Proposal:** Extract a shared `enrichListingsWithProfiles(listingsRows)` helper function. Both hooks call it.

**Risk:** Low. Pure data transformation extraction.

---

## Priority 9: `useMessages.ts` Polling Has Stale Closure

**File:** `src/hooks/useMessages.ts`

**Problem:** `startPolling` callback (line 35) captures `messages` in its closure but `messages` is a dependency. The `lastTimestamp` reference on line 50-52 uses the `messages` array from when `startPolling` was created, which may be stale. This could cause missed messages or duplicate fetches.

**Proposal:** Use a `messagesRef` to always access the latest messages array inside the polling callback, or move `lastTimestamp` tracking to a separate ref.

**Risk:** Medium. This is a subtle bug fix. Requires careful testing of the realtime fallback polling path.

---

## Implementation Order

| Phase | Items | Estimated Effort |
|-------|-------|-----------------|
| 1 | Priority 6 (breadcrumb fix), Priority 7 (settings placeholder) | Trivial |
| 2 | Priority 1 (shared ListingCard), Priority 8 (listing enrichment helper) | Small |
| 3 | Priority 3 (Index.tsx decomposition) | Medium |
| 4 | Priority 4 (PublicProfile modularization) | Medium |
| 5 | Priority 2 (type safety — incremental, across multiple PRs) | Ongoing |
| 6 | Priority 5 (admin React Query migration — one page per iteration) | Medium per page |
| 7 | Priority 9 (useMessages stale closure fix) | Small but requires testing |

Each phase is independently deployable. No phase depends on another. UI and functionality remain unchanged throughout.


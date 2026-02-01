
# Site-Wide Codebase Review & Refactoring Plan

## Executive Summary

Bu plan, kod tabanının kapsamli bir incelemesini ve refactoring onerilerini icerir. Amac: kod yapisini, okunabilirligi ve surdurulebilirligi artirmak; UI ve islevselligi degistirmeden. Tum oneriler artimli, dusuk riskli ve test ile desteklenmis olacaktir.

---

## Priority Ranking System

Files are ranked based on:
- **Usage Frequency**: How often the component/page is used
- **Complexity**: Lines of code, cognitive load
- **Maintainability Issues**: Code duplication, coupling, separation of concerns
- **Impact**: How many other parts of the codebase depend on it

| Priority | Criteria |
|----------|----------|
| P1 - Critical | High usage, significant complexity, immediate benefit |
| P2 - High | Moderate usage, notable improvement potential |
| P3 - Medium | Lower usage, would benefit from cleanup |
| P4 - Low | Minimal impact, nice-to-have improvements |

---

## Findings & Recommendations

### P1 - Critical Priority

#### 1. `src/App.tsx` (251 lines) - Route Duplication
**Issue**: Desktop ve mobile route tanimlari tamamen tekrarlanmis (lines 119-161 ve 179-221).

**Recommendation**:
- Route configuration'i ayri bir dosyaya tasiyarak tekrarlanan kodu ortadan kaldir
- Single route definition with responsive layout wrapper

**Proposed Structure**:
```text
src/
  routes/
    routeConfig.ts       (route definitions array)
    ProtectedRoute.tsx   (extracted component)
```

**Impact**: ~80 satir azalma, route degisikliklerinde tek bir yer guncelleme

**Testing Strategy**: 
- Tum route'larin hem desktop hem mobile'da erisilebilir oldugunu dogrula
- Protected route'larin yonlendirme davranisini test et

---

#### 2. `src/pages/teacher/MyListings.tsx` (1142 lines)
**Issue**: Cok buyuk dosya - form yonetimi, API cagrilari, UI rendering, state management hepsi bir arada.

**Recommendation**:
Dosyayi modullere ayir:

```text
src/pages/teacher/MyListings/
  index.tsx              (main export)
  ListingsPage.tsx       (ana container, ~200 lines)
  components/
    ListingCard.tsx      (ilan karti)
    ListingDialog.tsx    (create/edit dialog)
    ListingForm.tsx      (form component)
    FiltersBar.tsx       (search & filter UI)
  hooks/
    useListings.ts       (CRUD operations)
    useCategories.ts     (category fetching)
  types.ts               (ListingFormValues, etc.)
```

**Impact**: 
- Ana dosya 1142 -> ~200 satir
- Daha kolay test yazimi
- Izole edilmis concerns

**Testing Strategy**:
- Listing CRUD islemlerini test et
- Form validation'i dogrula
- Filter/search islevini kontrol et

---

#### 3. `src/pages/ListingDetail.tsx` (680 lines)
**Issue**: Uzun dosya, tekrarlanan UI bloklari (mobile ve desktop icin ayni "Uzman Hakkinda" karti iki kez yazilmis - lines 256-313 ve 615-674).

**Recommendation**:
```text
src/pages/ListingDetail/
  index.tsx
  ListingDetailPage.tsx
  components/
    TeacherInfoCard.tsx      (extracted, reused for mobile/desktop)
    BookingCard.tsx          (randevu karti)
    ProductPurchaseCard.tsx  (urun satin alma)
    ReviewsSection.tsx       (yorumlar)
    ListingHeader.tsx        (baslik + gorsel)
```

**Impact**: 
- ~60 satir duplicate kod kaldirimi
- Daha okunabilir ana component

**Testing Strategy**:
- Randevu olusturma akisini test et
- Urun satin alma akisini test et
- Responsive layout'u dogrula

---

#### 4. `src/pages/Profile.tsx` (644 lines)
**Issue**: Mobile ve desktop tamamen farkli render mantigi (line 288-419 mobile, line 423-639 desktop). Cok buyuk tek dosya.

**Recommendation**:
```text
src/pages/Profile/
  index.tsx
  ProfilePage.tsx           (container, router)
  MobileProfile.tsx         (mobile-specific UI)
  DesktopProfile.tsx        (desktop-specific UI)
  components/
    ProfileHeader.tsx       (avatar, name, badges)
    ProfileEditForm.tsx     (kullanici adi, bio)
    SecuritySettings.tsx    (sifre degistirme)
    AccountInfo.tsx         (hesap bilgileri)
    MobileMenuItem.tsx      (mobile menu items)
  hooks/
    useProfile.ts           (profile CRUD)
```

**Impact**: 
- Her layout icin ayri, anlasilir component
- Ortak parcalar paylasiliyor

**Testing Strategy**:
- Profile guncelleme islemini test et
- Sifre degistirme akisini dogrula
- Mobile/desktop layout'lari kontrol et

---

### P2 - High Priority

#### 5. `src/pages/admin/Approvals.tsx` (651 lines)
**Issue**: Buyuk dosya, approval logic + UI karismis.

**Recommendation**:
```text
src/pages/admin/Approvals/
  index.tsx
  ApprovalsPage.tsx
  components/
    ApprovalCard.tsx
    ApprovalTabs.tsx
  hooks/
    useApprovals.ts         (fetch, approve, reject, repair)
  types.ts
```

**Impact**: ~300 satir hook'a tasindi, UI daha temiz

---

#### 6. `src/contexts/AuthContext.tsx` (563 lines)
**Issue**: Cok fazla sorumluluk - auth state, helper functions, approval checks, role management.

**Recommendation**:
Yardimci fonksiyonlari ayir:

```text
src/contexts/
  AuthContext.tsx           (~200 lines, core provider)
  auth/
    authHelpers.ts          (ensureUserProfile, ensureUserRole, etc.)
    teacherApproval.ts      (createTeacherApproval, checkTeacherApprovalStatus)
    roleHelpers.ts          (fetchUserRoleFromDB)
    types.ts                (AuthContextType, TeacherApplicationData)
```

**Impact**: 
- AuthContext.tsx 563 -> ~200 satir
- Test edilebilir helper fonksiyonlar

---

#### 7. `src/lib/queries.ts` (447 lines)
**Issue**: Tum query hook'lari tek dosyada.

**Recommendation**:
Domain'e gore ayir:

```text
src/lib/queries/
  index.ts                  (barrel export)
  categoryQueries.ts        (useCategories, useCategoryWithSubcategories)
  listingQueries.ts         (useListing, useSubCategoryListings)
  profileQueries.ts         (useProfile, usePublicProfile)
  appointmentQueries.ts     (useAppointments)
  contentQueries.ts         (useCuriosities, useCuriosity)
  homeQueries.ts            (useHomeData)
```

**Impact**: Ilgili query'leri bulmak kolaylasir

---

### P3 - Medium Priority

#### 8. `src/components/Header.tsx` (237 lines)
**Issue**: Navigation items ve dropdown menu logic inline.

**Recommendation**:
- `UserDropdownMenu.tsx` extract et
- `navConfig.ts` for navigation items based on role

---

#### 9. Code Duplication: Expert Fetching

**Issue**: `ExpertsCarousel.tsx` ve `Experts.tsx` ayni `fetchApprovedExperts` fonksiyonunu icerir.

**Recommendation**:
```typescript
// src/lib/queries/expertQueries.ts
export function useApprovedExperts(limit?: number) {
  return useQuery({...});
}
```

Tek kaynak, her iki component kullanir.

---

#### 10. `src/pages/PublicProfile.tsx` (292 lines)
**Issue**: Inline component'ler (ListingCard, StatBadge).

**Recommendation**:
- `ListingCard` -> `src/components/ListingCard.tsx` (reusable)
- `StatBadge` -> `src/components/ui/stat-badge.tsx`

---

### P4 - Low Priority

#### 11. Static Pages Pattern

**Issue**: 7 static page (`About`, `HowItWorks`, `Contact`, `Terms`, `Privacy`, `FAQ`, `Production`) benzer yapi kullanir.

**Recommendation**:
- `StaticPageLayout.tsx` wrapper component
- Her sayfa sadece slug ve ozel content konfigurasyonu saglayacak

---

#### 12. Hook Naming Consistency

**Issue**: Bazi hook'lar `use-mobile.tsx` (kebab-case), bazilari `usePresence.ts` (camelCase).

**Recommendation**:
- Tum hook dosyalarini `useXxx.ts` formatina standardize et
- `use-mobile.tsx` -> `useMobile.tsx`
- `use-toast.ts` -> `useToast.ts`

---

#### 13. Breadcrumb Duplication

**Issue**: `AdminBreadcrumb.tsx` ve `PageBreadcrumb.tsx` benzer logic.

**Recommendation**:
- Tek `Breadcrumb` component, farkli config ile

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
- [x] Route configuration extraction (App.tsx) → `src/routes/routeConfig.ts`, `src/routes/ProtectedRoute.tsx`
- [x] Query hooks ayirimi (queries.ts) → `src/lib/queries/` folder with domain-specific files
- [x] Hook naming standardization → `useMobile.tsx`, `useToast.ts` (backward-compatible re-exports kept)

**Changes Made:**
- Created `src/routes/` directory with route configuration and ProtectedRoute component
- App.tsx reduced from 251 to 139 lines (route duplication eliminated)
- Created `src/lib/queries/` with 6 domain-specific query files
- queries.ts now re-exports from modular structure (backward compatible)
- New camelCase hooks created, old kebab-case files re-export for compatibility

### Phase 2: High-Impact Pages ✅ COMPLETED
- [x] MyListings.tsx modularization → `src/pages/teacher/MyListings/` with types.ts, hooks/, components/
- [x] ListingDetail.tsx component extraction → `src/pages/ListingDetail/` with TeacherInfoCard, ReviewsSection, ListingDescriptionCard (duplicate code eliminated)
- [x] Profile.tsx mobile/desktop split → `src/pages/Profile/` with MobileProfile, DesktopProfile, hooks/

**Changes Made:**
- ListingDetail: Extracted TeacherInfoCard (was duplicated for mobile/desktop), ReviewsSection, ListingDescriptionCard
- Profile: Separated into MobileProfile and DesktopProfile components, extracted useProfileData and usePasswordChange hooks
- MyListings: Created types.ts, useListings hook, useCategories hook, ListingCard, ListingStats, FiltersBar components

### Phase 3: Supporting Components ✅ COMPLETED
- [x] AuthContext helper extraction → `src/contexts/auth/` with types.ts, profileHelpers.ts, roleHelpers.ts, teacherApproval.ts
- [x] Approvals.tsx refactoring → `src/pages/admin/Approvals/` with hooks/useApprovals.ts, components/ApprovalCard.tsx, ApprovalsList.tsx
- [x] Header.tsx cleanup → `src/components/header/` with navConfig.ts, UserDropdownMenu.tsx

**Changes Made:**
- AuthContext.tsx reduced from 563 to ~270 lines (helper functions extracted to auth/ folder)
- Approvals.tsx split into ApprovalsPage.tsx (~60 lines), useApprovals hook (~280 lines), ApprovalCard, ApprovalsList components
- Header.tsx now uses extracted UserDropdownMenu and getCenterNavItems from header/ folder

### Phase 4: Polish ✅ COMPLETED
- [x] Expert fetching consolidation → `src/lib/queries/expertQueries.ts` with useApprovedExperts hook
- [x] Static pages pattern → `src/components/StaticPageLayout.tsx` wrapper component
- [x] Breadcrumb unification → `src/components/UnifiedBreadcrumb.tsx` (AdminBreadcrumb & PageBreadcrumb merged)

**Changes Made:**
- Created useApprovedExperts hook - ExpertsCarousel and Experts page now share single data fetching logic
- Created StaticPageLayout wrapper - About, Terms, Privacy, Production pages now use unified layout
- Created UnifiedBreadcrumb - merged all route labels, AdminBreadcrumb and PageBreadcrumb are now re-exports

---

## 🎉 REFACTORING PLAN COMPLETED

All 4 phases have been successfully implemented:
- **Phase 1**: Route extraction, query modularization, hook standardization
- **Phase 2**: MyListings, ListingDetail, Profile page modularization
- **Phase 3**: AuthContext helpers, Approvals refactoring, Header cleanup
- **Phase 4**: Expert fetching, static pages pattern, breadcrumb unification

---

## Testing Requirements

Her refactoring adimi icin:

1. **Unit Tests**: Extracted hook'lar ve helper'lar icin
2. **Component Tests**: Vitest + React Testing Library ile
3. **Manual Testing Checklist**:
   - Tum route'larin erisilebilir oldugunu kontrol et
   - Form submission'larin calıstigini dogrula
   - Mobile/desktop responsive davranisini test et
   - Auth flow'un bozulmadığını kontrol et

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes | Incremental refactoring, feature by feature |
| Import errors | Barrel exports, IDE refactoring tools |
| Lost functionality | Manual testing checklist per phase |
| Style changes | CSS-in-JS/Tailwind classes preserved as-is |

---

## Success Metrics

| Metric | Before | After Target |
|--------|--------|--------------|
| Largest file | 1142 lines (MyListings) | <400 lines |
| Duplicate code blocks | ~8 identified | 0 |
| Files >500 lines | 6 files | 0 files |
| Hook naming consistency | Mixed | 100% camelCase |

---

## Technical Details

### Route Configuration Extract Example

```typescript
// src/routes/routeConfig.ts
export const routes = [
  { path: "/", element: Index, protected: false },
  { path: "/messages", element: Messages, protected: true },
  { path: "/admin/approvals", element: Approvals, protected: true, roles: ["admin"] },
  // ... etc
];
```

### Component Extraction Pattern

```typescript
// Before (inline in page)
const TeacherInfo = () => <Card>...</Card>;

// After (extracted)
// src/components/TeacherInfoCard.tsx
export function TeacherInfoCard({ teacher, reviews }: TeacherInfoCardProps) {
  return <Card>...</Card>;
}
```

### Hook Extraction Pattern

```typescript
// Before (inline in component)
const fetchListings = async () => { ... };
useEffect(() => { fetchListings(); }, []);

// After (custom hook)
// src/hooks/useListings.ts
export function useListings(userId: string) {
  return useQuery({
    queryKey: ['listings', userId],
    queryFn: async () => { ... },
  });
}
```

---

## Conclusion

Bu refactoring plani, kod tabaninin surdurulebilirligini onemli olcude artirmadan UI ve islevsellige dokunmadan yapisal iyilestirmeler onerır. Her adim artimli, test edilebilir ve geri alinabilir sekilde planlanmistir.

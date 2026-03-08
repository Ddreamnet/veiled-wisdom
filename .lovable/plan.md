

# Bottom Nav Ortak Sistem — Tarama Sonuçları + Uygulama Planı

## Tarama Sonuçları

Bottom-nav / bottom-spacing ile ilişkili **tüm** kullanımlar:

| Dosya | Satır | Mevcut Değer | Durum |
|---|---|---|---|
| `MobileBottomNav.tsx` | 264 | `minHeight: 68px` | Güncellenecek → `BOTTOM_NAV_HEIGHT` |
| `App.tsx` | 105 | `calc(80px + env(...))` | Güncellenecek → `BOTTOM_NAV_CONTENT_OFFSET` |
| `MobileLayout.tsx` | 24-25 | `pb-24` + `calc(80px + env(...))` | Güncellenecek → `BOTTOM_NAV_CONTENT_OFFSET`, `pb-24` kaldırılacak |
| `BankTransferScreen.tsx` | 219 | `bottom-[calc(80px+env(...))]` | Güncellenecek → inline style with `BOTTOM_NAV_CONTENT_OFFSET` |
| `MobileProfile.tsx` | 55 | `pb-24` | Güncellenecek → inline style with `BOTTOM_NAV_CONTENT_OFFSET` |

**Sistem dışında kalan, dokunulmayacak yerler** (bottom-nav ile ilgisiz):
- `MessageInput.tsx` — chat input'un kendi safe area padding'i, bottom nav'dan bağımsız
- `VideoCall/CallUI.tsx` — video call controls, bottom nav gizli olduğunda kullanılıyor
- `textarea.tsx` — `min-h-[80px]` textarea yüksekliği, ilgisiz
- `MobileHeader.tsx` — `min-w-[80px]` layout spacing, ilgisiz

## Uygulama Planı

### 1. Constants (`src/lib/constants.ts`)
```ts
export const BOTTOM_NAV_HEIGHT = 56;
export const BOTTOM_NAV_PADDING_EXTRA = 12;
export const BOTTOM_NAV_CONTENT_OFFSET = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_PADDING_EXTRA; // 68
```

### 2. Güncellenecek 5 dosya

1. **`MobileBottomNav.tsx`** — `minHeight: 68px` → `${BOTTOM_NAV_HEIGHT}px`
2. **`App.tsx`** — `calc(80px + ...)` → `` `calc(${BOTTOM_NAV_CONTENT_OFFSET}px + ...)` ``
3. **`MobileLayout.tsx`** — `pb-24` kaldır, style → `BOTTOM_NAV_CONTENT_OFFSET`
4. **`BankTransferScreen.tsx`** — Tailwind `bottom-[calc(80px+...)]` → inline style
5. **`MobileProfile.tsx`** — `pb-24` → inline style with `BOTTOM_NAV_CONTENT_OFFSET`

### Uygulama sırası
1. Constants ekle
2. MobileBottomNav güncelle
3. App.tsx güncelle
4. MobileLayout güncelle
5. BankTransferScreen güncelle
6. MobileProfile güncelle


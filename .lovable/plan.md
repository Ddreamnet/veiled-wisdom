

# Mobil Video Call UI — Nihai Plan (v3.1)

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `constants.ts` | Yeni sabitler |
| `DraggablePiP.tsx` | Portre PiP + pointer-based tap/drag ayrımı |
| `WaitingRoom.tsx` | Portre self-preview (CSS-based responsive) |

---

## 1. constants.ts — Yeni Sabitler

```ts
export const MOBILE_SELF_VIEW_ASPECT = 3 / 4;

// PiP gesture
export const PIP_DRAG_THRESHOLD = 25;       // px — ana kriter
export const MAX_TAP_DURATION_MS = 400;     // ikincil güvenlik — uzun basma koruması
export const POST_DRAG_IGNORE_MS = 100;     // test ile 150-200'e ayarlanabilir

// PiP size limits (mobile)
export const PIP_MIN_WIDTH = 90;
export const PIP_MAX_WIDTH = 140;
export const PIP_WIDTH_PERCENT = 0.28;
```

---

## 2. DraggablePiP — Pointer-Based Gesture Sistemi

### Tap vs Drag Karar Mantığı

```text
pointerdown → activePointerId kaydet, startPos kaydet, hasDragged=false, startTime kaydet
pointermove → sadece aynı pointerId ise işle; delta > PIP_DRAG_THRESHOLD → hasDragged=true
pointerup   → sadece aynı pointerId ise işle
              hasDragged===false AND duration<=MAX_TAP_DURATION_MS AND (now-lastDragEnd>POST_DRAG_IGNORE_MS)
              → onClick?.()
pointercancel / lostpointercapture → tüm ref'leri resetle
```

**Uzun basma senaryosu:** `duration > MAX_TAP_DURATION_MS` → switch tetiklenmez. Test planındaki "uzun basıp bırakma ama sürüklememe → switch yok" ile tutarlı.

**Pointer type:** `onPointerDown/Move/Up/Cancel` tüm pointer type'ları (touch, mouse, pen) kapsar. Ayrıştırma gerekmez — aynı mantık hepsinde çalışır.

**Aktif pointer ID takibi:**
- `activePointerIdRef = useRef<number | null>(null)`
- `onPointerDown` → `activePointerIdRef.current = event.pointerId`
- Diğer event'lerde `event.pointerId !== activePointerIdRef.current` ise ignore
- Çoklu dokunma / ikinci parmak state'i bozmaz

### Framer Motion Drag ile Birlikte Çalışma

- `onDragStart` → `isDraggingRef = true`
- `onDragEnd` → `isDraggingRef = false`, `lastDragEndRef = Date.now()`, snap to corner
- **`onDragEnd` içinden `onClick` çağrısı tamamen kaldırılacak** — tap tetikleme yalnızca `onPointerUp`'tan
- `handleDragEnd`'deki mevcut `totalMovement < DRAG_THRESHOLD → onClick?.()` bloğu silinecek

**Event propagation doğrulaması (doğrulama maddesi):**
- Framer Motion `drag` ve custom pointer event'leri aynı `motion.div` üzerinde birlikte çalışabilir
- PiP içindeki child elemanlar pointer event'i yutmamalı — gerekirse children wrapper'a `pointer-events: none` eklenecek
- Pratikte doğrulanacak

### PiP Portre Boyut

```ts
const rawWidth = Math.round(containerWidth * PIP_WIDTH_PERCENT);
const width = Math.max(PIP_MIN_WIDTH, Math.min(PIP_MAX_WIDTH, rawWidth));
const height = Math.round(width / MOBILE_SELF_VIEW_ASPECT); // 3/4 → height = width * 4/3
```

390px → 109×145px, 320px → 90×120px, 430px → 120×160px

### Corner Snap + Safe Area (doğrulama maddesi)

- Üst köşelerde notch/status bar çakışması → `SAFE_PADDING.top` yeterliliği doğrulanacak
- Alt köşelerde call controls çakışması → `bottomOffset` prop kontrolü doğrulanacak
- Landscape orientation → resize listener mevcut, bounds yeniden hesaplanıyor — doğrulanacak

### Badge/Overlay Uyumu

Portre PiP daha dar (~90-140px). "Siz" badge `text-[10px]`, mic-off `h-2.5 w-2.5`, kamera-off avatar `h-10 w-10` — pratikte doğrulanacak.

---

## 3. WaitingRoom — Portre Preview (CSS-Based Responsive)

**Değişiklik:** `useIsMobile` hook kullanılmayacak. Oran tamamen CSS ile yönetilecek.

`MOBILE_SELF_VIEW_ASPECT` sabiti `3 / 4 = 0.75`. Bunu Tailwind responsive class'ları ile uygulayacağız:

```tsx
// aspect-video kaldırılacak, yerine:
className="relative aspect-[3/4] md:aspect-video max-w-[280px] md:max-w-lg mx-auto bg-card rounded-2xl ..."
```

**Tek kaynak garantisi:** `aspect-[3/4]` değeri `MOBILE_SELF_VIEW_ASPECT` sabitinden türetilmiş bir Tailwind class'ıdır. Bu oran değişirse hem bu class hem DraggablePiP'teki sabit birlikte güncellenmelidir — bu trade-off kabul edilebilir çünkü:
- Oran nadiren değişecek bir tasarım kararı
- CSS-first yaklaşım hydration shift riskini tamamen ortadan kaldırıyor
- JS sabiti yalnızca DraggablePiP'te (zaten JS ile boyut hesaplayan) kullanılacak

**Kamera kapalı placeholder:** `absolute inset-0 flex items-center justify-center` — portre kutuda da düzgün ortalanır, ek değişiklik gerekmez.

---

## 4. Switch Davranışı — Açık Kurallar

| Durum | Tap davranışı |
|---|---|
| Remote participant var, videosu açık | Switch çalışır |
| Remote participant var, videosu kapalı | **Switch çalışır** — remote tile placeholder (avatar) gösterir |
| Remote yok (waiting room) | PiP gösterilmiyor, switch yok |

**State:** `isVideoSwapped` tek `useState(false)` boolean — yalnızca `handlePiPClick` toggle eder, drag ile yarışan başka logic yok.

---

## 5. POST_DRAG_IGNORE_MS Doğrulama

- Başlangıç değeri 100ms
- Test sırasında drag sonrası yanlışlıkla switch tetiklenirse 150-200ms'e çıkarılacak
- Farklı cihazlarda doğrulanacak

---

## 6. Test Planı

| Senaryo | Beklenen |
|---|---|
| Tek kısa tap (< 25px, < 400ms) | Switch |
| Hafif parmak kayması (< 25px) | Switch |
| Uzun basıp bırakma, sürüklememe (> 400ms) | Switch yok |
| Gerçek sürükleme (> 25px) | Sadece taşıma |
| Sürükle bırak sonrası hemen tekrar tap | İlk tap ignore (POST_DRAG_IGNORE), ikincisi çalışır |
| Çift dokunma (double tap) | İki switch tetiklenir (geri döner) — kabul edilebilir |
| Çok hızlı art arda iki tap | İki switch — state tutarlı |
| Multi-touch / ikinci parmak | İkinci parmak ignore (activePointerId kontrolü) |
| Drag sonrası hemen tap | POST_DRAG_IGNORE koruması |
| Orientation değişimi | Bounds yeniden hesaplanır, PiP clamp edilir |
| Remote video kapalıyken switch | Çalışır, placeholder görünür |
| Masaüstü | Değişiklik yok |
| Bekleme ekranı kamera açık | Portre preview |
| Bekleme ekranı kamera kapalı | Placeholder ortalı |
| Event propagation — badge/overlay tap | Switch tetiklenir |
| POST_DRAG_IGNORE_MS yeterliliği | Farklı cihazlarda test edilecek |
| WaitingRoom ilk render | CSS-based — layout shift yok |

---

## 7. Uygulama Sırası

1. `constants.ts` → tüm yeni sabitler
2. `DraggablePiP.tsx` → portre boyut + pointer-based gesture + post-drag guard
3. `WaitingRoom.tsx` → CSS responsive portre preview (`aspect-[3/4] md:aspect-video`)


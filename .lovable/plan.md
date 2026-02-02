
# Video Call PiP (Picture-in-Picture) Tasarımı

## Genel Bakış

Mobilde video görüşme UI'ını tam bir PiP deneyimine dönüştüreceğiz:
- Karşı tarafın videosu tam ekran arka plan olarak görünecek
- Kendi kameranız küçük, sürüklenebilir bir pencerede (PiP) sağ altta duracak
- PiP penceresi 4 köşeye mıknatıs gibi yapışacak

```text
┌────────────────────────────────────────┐
│  "Görüşme aktif" status bar            │
├────────────────────────────────────────┤
│                                        │
│                                        │
│      KARŞI TARAFIN VİDEOSU             │
│        (TAM EKRAN / BACKGROUND)        │
│                                        │
│                                        │
│                            ┌─────────┐ │
│                            │  SİZ    │ │  ← PiP (sürüklenebilir)
│                            │ (local) │ │
│                            └─────────┘ │
├────────────────────────────────────────┤
│   [📹] [🎤] [📞]  Control Bar          │
├────────────────────────────────────────┤
│         Mobile Bottom Nav              │
└────────────────────────────────────────┘
```

## Teknik Detaylar

### 1. Yeni Bileşen: DraggablePiP

**Dosya:** `src/pages/VideoCall/components/DraggablePiP.tsx`

Özellikler:
- Pointer Events API ile touch ve mouse desteği
- 4 köşeye snap animasyonu (Framer Motion)
- Safe area desteği (iPhone notch/home bar)
- Responsive boyutlandırma (mobil: %28 genişlik, desktop: 200px)
- 16:9 aspect ratio koruması
- Yasak bölgeler: status bar ve control bar ile çakışmama

```typescript
// Snap köşeleri hesaplama
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Padding değerleri (safe area + UI elemanları)
const SAFE_PADDING = {
  top: 60,    // Status bar yüksekliği
  bottom: 140, // Control bar + navbar
  left: 16,
  right: 16
};
```

### 2. CallUI.tsx Güncellemesi

**Mobil Layout Değişikliği:**

```typescript
// ÖNCE: Grid layout (2 eşit video)
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  {localParticipant && <VideoTile ... />}
  {remoteParticipants.map(...)}
</div>

// SONRA: Mobilde PiP layout
{isMobile ? (
  <>
    {/* Uzak video tam ekran */}
    <div className="absolute inset-0">
      {remoteParticipants[0] && <VideoTile ... className="w-full h-full" />}
    </div>
    
    {/* Yerel video PiP */}
    {localParticipant && (
      <DraggablePiP>
        <VideoTile ... variant="pip" />
      </DraggablePiP>
    )}
  </>
) : (
  // Desktop: Mevcut grid layout
)}
```

### 3. Snap Algoritması

```typescript
function getNearestCorner(x: number, y: number, bounds: Bounds): Corner {
  const corners = {
    'top-left': { x: bounds.left, y: bounds.top },
    'top-right': { x: bounds.right, y: bounds.top },
    'bottom-left': { x: bounds.left, y: bounds.bottom },
    'bottom-right': { x: bounds.right, y: bounds.bottom }
  };
  
  let nearest: Corner = 'bottom-right';
  let minDistance = Infinity;
  
  for (const [corner, pos] of Object.entries(corners)) {
    const distance = Math.hypot(x - pos.x, y - pos.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = corner as Corner;
    }
  }
  
  return nearest;
}
```

### 4. Drag Davranışı

- `onPointerDown`: Sürükleme başlat, başlangıç pozisyonunu kaydet
- `onPointerMove`: `transform: translate3d(x, y, 0)` ile pozisyon güncelle
- `onPointerUp`: En yakın köşeyi hesapla, animasyonlu snap

```typescript
const handlePointerUp = () => {
  const nearest = getNearestCorner(currentX, currentY, bounds);
  setSnapCorner(nearest); // Framer Motion animasyonu tetikler
};
```

### 5. Animasyon Konfigürasyonu

```typescript
// Snap animasyonu - yumuşak spring efekti
const springConfig = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1
};

// Köşe pozisyonları
const cornerPositions = {
  'top-left': { x: PADDING, y: topBound },
  'top-right': { x: containerWidth - pipWidth - PADDING, y: topBound },
  'bottom-left': { x: PADDING, y: bottomBound },
  'bottom-right': { x: containerWidth - pipWidth - PADDING, y: bottomBound }
};
```

### 6. PiP Boyutlandırma

```typescript
// Responsive boyut hesaplama
const getPiPSize = (containerWidth: number, isMobile: boolean) => {
  if (isMobile) {
    const width = Math.round(containerWidth * 0.28); // %28 genişlik
    const height = Math.round(width * 9 / 16);       // 16:9 oran
    return { width, height };
  }
  return { width: 200, height: 112 }; // Desktop: sabit 200x112
};
```

### 7. Yasak Bölgeler

PiP penceresinin çakışmaması gereken alanlar:
- Üst: Status bar (yaklaşık 44px)
- Alt: Control bar (56px) + Navbar (68px) + safe area
- Kenarlar: 16px minimum padding

```typescript
const calculateBounds = () => ({
  top: statusBarHeight + 8,
  bottom: containerHeight - controlBarHeight - navbarHeight - safeAreaBottom - pipHeight - 8,
  left: 16,
  right: containerWidth - pipWidth - 16
});
```

### 8. State Yönetimi

```typescript
// PiP pozisyon state'i
const [snapCorner, setSnapCorner] = useState<Corner>('bottom-right');

// Resize/rotation durumunda yeniden hesaplama
useEffect(() => {
  const handleResize = () => {
    // Mevcut köşeyi koru, yeni pozisyonu hesapla
    setPosition(getCornerPosition(snapCorner, newBounds));
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [snapCorner]);
```

### 9. VideoTile Güncellenmesi

PiP varyantı için minimal stil:

```typescript
// types.ts'e eklenecek
export interface VideoTileProps {
  sessionId: string;
  isLocal: boolean;
  displayName: string;
  variant?: 'default' | 'pip' | 'fullscreen';
}
```

```typescript
// VideoTile.tsx - PiP varyantı
const variantStyles = {
  default: 'aspect-[4/3] md:aspect-video rounded-lg md:rounded-xl',
  pip: 'w-full h-full rounded-xl shadow-2xl border-2 border-white/20',
  fullscreen: 'w-full h-full rounded-none'
};
```

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/pages/VideoCall/components/DraggablePiP.tsx` | Yeni oluştur |
| `src/pages/VideoCall/components/index.ts` | Export ekle |
| `src/pages/VideoCall/types.ts` | PiP tipleri ekle |
| `src/pages/VideoCall/CallUI.tsx` | Mobil PiP layout |
| `src/pages/VideoCall/components/VideoTile.tsx` | Variant prop |

## Ek Özellikler

1. **Double-tap to swap**: PiP'e çift tıklayınca ana video ile yer değiştirme (gelecek için)
2. **Snap threshold**: 50px yaklaştığında köşeye çekme hissi
3. **Visual feedback**: Sürükleme sırasında hafif gölge artışı
4. **Performance**: `will-change: transform` ve GPU hızlandırması



# Video Call Mobil UI Tasarım Güncellemesi

## Mevcut Durum Analizi

Şu anda `CallUI.tsx` dosyasında (satır 495-592):

```text
┌────────────────────────────────────────┐
│  "Görüşme aktif" status bar (py-2)     │
├────────────────────────────────────────┤
│                                        │
│                                        │
│        Video Grid (p-4, gap-4)         │
│      - aspect-video kart formatı       │
│      - kartlar arası fazla boşluk      │
│                                        │
│                                        │
├────────────────────────────────────────┤
│         Control Bar (p-4)              │  ← Sayfa sonunda, sticky değil
│   [Kamera] [Mikrofon] [Kapat]          │
├────────────────────────────────────────┤
│         Mobile Bottom Nav              │  ← Navbar üstte kontrol yok
└────────────────────────────────────────┘
```

## İstekler ve Çözümler

### 1. Kamera kartları arası mesafe azaltılacak
**Mevcut:** `gap-4` (16px)
**Yeni:** Mobilde `gap-2` (8px), desktop'ta `gap-4`

### 2. Kamera pencereleri tüm alanı kaplayacak
**Sınırlar:**
- Üst: "Görüşme aktif" div'inin alt çizgisi
- Alt: Navbar'ın üst çizgisi (kontrol butonları dahil)
- Sağ/Sol: Ekrana bitişik (padding yok)

**Çözüm:**
- Mobilde video grid padding'i kaldırılacak (`p-0`)
- `aspect-video` yerine esnek yükseklik kullanılacak
- Grid alanı `flex-1` ile dinamik olarak hesaplanacak

### 3. Kontrol butonları navbar üzerine sticky
**Mevcut:** Control bar sayfa içinde, normal akışta
**Yeni:** Fixed/sticky pozisyon, navbar'ın hemen üzerinde

## Teknik Değişiklikler

### Dosya: `src/pages/VideoCall/CallUI.tsx`

#### Değişiklik 1: Video Grid Layout (satır 519-553)
```typescript
// ÖNCE
<div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

// SONRA
<div className="flex-1 px-0 py-1 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
```

#### Değişiklik 2: Control Bar Sticky Pozisyon (satır 564-586)
```typescript
// ÖNCE
<motion.div
  initial={{ y: 50 }}
  animate={{ y: 0 }}
  className="p-4 flex items-center justify-center gap-3 bg-background/50 backdrop-blur-sm border-t border-border"
>

// SONRA
<motion.div
  initial={{ y: 50 }}
  animate={{ y: 0 }}
  className="sticky bottom-[calc(68px+env(safe-area-inset-bottom,0px))] md:bottom-0 z-40 p-3 md:p-4 flex items-center justify-center gap-3 bg-background/80 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
>
```
- `bottom-[calc(68px+...)]`: Navbar yüksekliği (68px) + safe area
- Mobilde navbar üzerine yapışık kalacak

#### Değişiklik 3: Ana Container Scroll Ayarı
```typescript
// ÖNCE
<motion.div className="h-screen bg-gradient-to-br ... flex flex-col">

// SONRA
<motion.div className="h-[100dvh] md:h-screen bg-gradient-to-br ... flex flex-col overflow-hidden">
```
- `100dvh`: Dinamik viewport height (mobil toolbar'ları hesaba katar)
- `overflow-hidden`: Scroll kaymasını önler

### Dosya: `src/pages/VideoCall/components/VideoTile.tsx`

#### Değişiklik 4: Mobilde Aspect Ratio Esnek
```typescript
// ÖNCE
<div className="relative bg-card rounded-xl overflow-hidden aspect-video border ...">

// SONRA
<div className="relative bg-card rounded-lg md:rounded-xl overflow-hidden aspect-[4/3] md:aspect-video border ...">
```
- Mobilde `aspect-[4/3]` daha kompakt görünüm sağlar
- `rounded-lg` mobilde daha ince köşeler

#### Değişiklik 5: Video Grid İçin h-full
VideoTile'ın parent'ından yükseklik almasını sağlamak için motion.div wrapper'ına `h-full` eklenecek.

## Sonuç Görünümü

```text
┌────────────────────────────────────────┐
│  "Görüşme aktif" status bar            │  ← Üst sınır
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ │        Yerel Video (Siz)           │ │  ← Tam genişlik
│ │                                    │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │  ← gap-2 (8px)
│ │                                    │ │
│ │       Uzak Video (Katılımcı)       │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│   [📹] [🎤] [📞]  Control Bar          │  ← Sticky, navbar üstünde
├────────────────────────────────────────┤
│         Mobile Bottom Nav              │  ← Alt sınır
└────────────────────────────────────────┘
```

## Ek İyileştirmeler

1. **Control butonları mobilde biraz küçültülecek**: `h-12 w-12` vs `h-14 w-14`
2. **Status bar mobilde daha kompakt**: `py-1.5` vs `py-2`
3. **Blur efekti artırılacak**: `backdrop-blur-xl` ile daha şık görünüm


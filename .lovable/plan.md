
# Video Call Name Badge ve Footer Z-index Düzeltmeleri

## Sorun 1: PiP Kamera Penceresinde "Siz" Etiketi Konumu

### Mevcut Durum
`VideoTile.tsx` dosyasında PiP variant için `nameBadge` pozisyonu değiştirilmiş görünüyor:
```typescript
pip: {
  nameBadge: 'absolute top-1 right-1',  // Sağ üst
  micIndicator: 'absolute bottom-1 left-1', // Sol alt
}
```

### Çözüm
Değişiklik kodda mevcut, ancak yansımıyorsa bunun nedeni:
1. Build cache sorunu olabilir - sayfayı hard refresh (Ctrl+Shift+R) yaparak kontrol edilmeli
2. Eğer sorun devam ederse, pozisyonlamayı daha spesifik hale getirmek gerekebilir

Eğer hard refresh sonrası sorun devam ederse, daha güçlü pozisyonlama:
```typescript
pip: {
  container: 'relative bg-card overflow-hidden w-full h-full',
  nameBadge: 'absolute top-1 right-1 z-10',  // z-10 eklendi
  micIndicator: 'absolute bottom-1 left-1 z-10',
  avatar: 'h-10 w-10',
  avatarText: 'text-lg',
},
```

---

## Sorun 2: Desktop Footer Görüntülerin Arkasında

### Sorunun Kaynağı
Footer bileşeni `relative` kullanıyor ancak z-index değeri yok. Ana sayfadaki içerik bölümlerinde `relative z-10` kullanıldığından, bu içerikler footer'ın üzerinde görünüyor.

### Etkilenen Kodlar

**Footer.tsx (Satır 6)**:
```typescript
<footer className="relative w-full border-t border-silver/10 bg-card/50 backdrop-blur-sm mt-auto overflow-hidden">
```
- z-index yok, varsayılan olarak `z-auto` (0)

**Index.tsx (Satır 134)**:
```typescript
<div className="container relative z-10" style={{...}}>
```
- Hero section `z-10` kullanıyor ve footer'ın üzerinde kalıyor

### Çözüm
Footer'a z-index ekleyerek diğer içeriklerden üstte kalmasını sağlamak:

```typescript
// Footer.tsx - Satır 6
<footer className="relative z-20 w-full border-t border-silver/10 bg-card/50 backdrop-blur-sm mt-auto overflow-hidden">
```

Ayrıca iç container'ların da relative z değerlerini düzeltmek:

```typescript
// Satır 34 - İç content wrapper
<div className="relative z-10 w-full py-8">

// Satır 176 - Alt copyright bölümü  
<div className="relative z-10 w-full">
```

---

## Teknik Değişiklikler

### Dosya 1: `src/pages/VideoCall/components/VideoTile.tsx`

PiP variant stillerine z-index ekle:

| Önceki | Sonraki |
|--------|---------|
| `nameBadge: 'absolute top-1 right-1'` | `nameBadge: 'absolute top-1 right-1 z-10'` |
| `micIndicator: 'absolute bottom-1 left-1'` | `micIndicator: 'absolute bottom-1 left-1 z-10'` |

### Dosya 2: `src/components/Footer.tsx`

Footer'a z-20 ve iç elementlere z-10 ekle:

| Satır | Önceki | Sonraki |
|-------|--------|---------|
| 6 | `relative w-full ...` | `relative z-20 w-full ...` |
| 34 | `relative w-full py-8` | `relative z-10 w-full py-8` |
| 176 | `relative w-full` | `relative z-10 w-full` |

---

## Test Kriterleri

1. **PiP Name Badge**:
   - Video call sayfasına git
   - PiP penceresinde "Siz" etiketi sağ üstte görünmeli
   - Mikrofon kapalı ikonu sol altta görünmeli

2. **Desktop Footer**:
   - Ana sayfaya git
   - Sayfayı en alta scroll et
   - Footer tüm içeriklerin üzerinde, düzgün görünmeli
   - Wave animasyonu ve gradient overlay'ler doğru çalışmalı

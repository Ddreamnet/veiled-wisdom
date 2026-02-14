

# PiP Penceresi: Suruklerken Switch Olma Sorununu Duzeltme

## Sorun

PiP penceresinde iki ayri mekanizma ayni anda "tiklama" algilayarak switch tetikliyor:
1. Framer Motion'in `onTap` handler'i
2. `handleDragEnd` icindeki hareket esigi kontrolu (8px)

Ayrica 8 piksellik esik, mobil dokunmatik ekranlarda parmagin dogal titremesi icin cok dusuk.

## Cozum

**Dosya:** `src/pages/VideoCall/components/DraggablePiP.tsx`

1. `onTap` handler'ini kaldir (duplicate cagrimi onle)
2. `DRAG_THRESHOLD` degerini 8px'den 15px'e cikar (mobilde dogal parmak hareketi icin)
3. Tap/click tetiklemesini sadece `handleDragEnd` icinde tut - tek bir karar noktasi

## Teknik Detay

- `onTap` satirlari (310-314) silinecek
- `DRAG_THRESHOLD` sabiti 8'den 15'e yukseltilecek
- Sadece `handleDragEnd` icindeki `totalMovement < DRAG_THRESHOLD` kontrolu `onClick` cagrisini yapacak
- Diger hicbir dosya degismeyecek


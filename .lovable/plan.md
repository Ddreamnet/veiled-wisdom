
# Mobil Login Ekrani - Gradient ve Ortalama Duzeltmesi

## Sorun

Mobil shell layout'ta SignIn bileseninin `fixed inset-0` kullanmasi header/navbar ile catisiyor. Gradient arkaplan sadece kart arkasinda kaliyor, header ve navbar arkasi bos/koyu gorunuyor. Kart da header-navbar arasinda dogru ortalanmiyor.

## Strateji

Iki katmanli yaklasim:
1. **Gradient arkaplan**: `fixed inset-0` ile tum ekrani kaplayan ayri bir katman (header ve navbar arkasi dahil), dusuk z-index ile
2. **Kart ortalama**: `fixed inset-0` yerine parent `<main>`'i dolduran flex container, header ve navbar arasindaki alani kullanarak tam ortalama

## Degisiklikler

### Dosya: `src/pages/auth/SignIn.tsx`

**Dis container'i ikiye bol:**

```tsx
// ONCEKI:
<div className="fixed inset-0 flex items-center justify-center p-4 liquid-gradient overflow-hidden">
  <Card ...>

// SONRAKI:
<>
  {/* Gradient arkaplan - tum ekrani kaplar (header/navbar arkasi dahil) */}
  <div className="fixed inset-0 liquid-gradient -z-10" />
  
  {/* Kart container - main icinde flex-1 ile header/navbar arasinda ortalanir */}
  <div className="flex items-center justify-center p-4 min-h-full">
    <Card ...>
  </div>
</>
```

**Kart'tan `max-h-[90dvh]` kaldir** - artik gerekli degil cunku kart sabit ekran yerine flow icinde:

```tsx
<Card className="w-full max-w-md glass-effect border-silver/20">
```

### Dosya: `src/App.tsx`

Mobil main'den auth sayfalarindaki `paddingBottom`'i kaldir. Auth sayfalarinda navbar arkasina itmek icin padding gereksiz cunku gradient zaten tum ekrani kapliyor:

Main'in `paddingBottom` style'ini auth route'larinda sifirlamak icin, SignIn kendi container'inda `pb-0` kullanabilir veya mevcut padding zaten sorun yaratmaz cunku kart flex ile ortalanacak - bu yuzden App.tsx'e dokunmaya gerek yok.

## Gorsel Sonuc

```text
+---------------------------+
| MobileHeader              |  <- gradient arkasinda gorunur
+---------------------------+
|                           |
|                           |
|     [  Giris Yap Karti  ] |  <- header ve navbar arasinda tam ortali
|                           |
|                           |
+---------------------------+
| MobileBottomNav           |  <- gradient arkasinda gorunur
+---------------------------+

Tum arkaplan = liquid-gradient (mor gradient)
```

## Teknik Detaylar

| Katman | CSS | Amac |
|--------|-----|------|
| Gradient bg | `fixed inset-0 liquid-gradient -z-10` | Tum ekrani kaplayan gradient, header/navbar arkasi dahil |
| Kart container | `flex items-center justify-center min-h-full p-4` | Main icinde kalan alan kadar yukseklik, tam ortalama |
| Kart | `w-full max-w-md glass-effect` | Sabit genislik, cam efekti |

Sadece `src/pages/auth/SignIn.tsx` degisecek. App.tsx'e dokunulmayacak.

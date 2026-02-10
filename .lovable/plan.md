

# Mobil Login Ekrani Duzeltmesi

## Sorunlar
1. `min-h-screen` kullanimi mobilde scroll olusturuyor (dvh/svh sorunu)
2. Kart padding ve boyutu mobilde ekrani tasirabiliyor
3. Mor gradient arka plan tam ekrani kaplamayabiliyor

## Degisiklikler

**Dosya:** `src/pages/auth/SignIn.tsx`

Dis container'i degistir:

```tsx
// ONCEKI (satir 31):
<div className="min-h-screen flex items-center justify-center p-4 liquid-gradient">

// SONRAKI:
<div className="fixed inset-0 flex items-center justify-center p-4 liquid-gradient overflow-hidden">
```

- `min-h-screen` yerine `fixed inset-0` kullanarak tam ekran kaplama ve scroll'u engelleme
- `overflow-hidden` ile tasmayi onleme
- `liquid-gradient` zaten absolute pseudo-element kullandigi icin `fixed inset-0` ile tam ekrana yayilacak

Kart boyutunu mobilde kucult:

```tsx
// ONCEKI (satir 32):
<Card className="w-full max-w-md glass-effect border-silver/20">

// SONRAKI:
<Card className="w-full max-w-md glass-effect border-silver/20 max-h-[90dvh] overflow-y-auto">
```

Logo ve baslik boyutlarini mobilde kucult:

```tsx
// Logo: h-16 w-16 -> h-12 w-12 mobilde
<img src={logo} alt="Leyl" className="h-12 w-12 md:h-16 md:w-16" />

// Baslik: text-3xl -> text-2xl mobilde
<CardTitle className="text-2xl md:text-3xl ...">

// Header space: space-y-4 -> space-y-2 mobilde
<CardHeader className="space-y-2 md:space-y-4">

// Form space: space-y-4 -> space-y-3 mobilde
<form ... className="space-y-3 md:space-y-4">
```

## Ozet

| Degisiklik | Amac |
|-----------|------|
| `fixed inset-0` + `overflow-hidden` | Scroll'u engelle, tam ekran gradient |
| Responsive logo/baslik boyutlari | Mobilde tasmayi onle |
| Daha kompakt spacing | Icerik ekrana sigsin |


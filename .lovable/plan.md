
# Mobil ve Tablette Scrollbar Gizleme

## Ozet
Mobil ve tablet gorunumlerinde (767px ve alti) scrollbar gorunmeyecek, ancak kaydirma (scroll) islevi devam edecek. Masaustunde mevcut scrollbar tasarimi korunacak.

## Degisiklik

**Dosya:** `src/index.css` (satir 74-97 arasi)

Mevcut scrollbar stillerini bir `@media (min-width: 768px)` media query icine alarak sadece masaustunde gorunmesini saglamak. Mobil/tablet icin `scrollbar-width: none` ve `::-webkit-scrollbar { display: none }` eklemek.

```css
/* ONCEKI (satir 74-97): tum cihazlarda scrollbar gorunur */

/* SONRAKI: */
* {
  @apply border-border;
}

/* Mobil ve tablet: scrollbar gizle, kaydirma devam eder */
@media (max-width: 767px) {
  * {
    scrollbar-width: none; /* Firefox */
  }
  *::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Edge */
  }
}

/* Masaustu: mevcut scrollbar tasarimi */
@media (min-width: 768px) {
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--scrollbar-thumb)) hsl(var(--scrollbar-track));
  }
  *::-webkit-scrollbar {
    width: var(--scrollbar-size);
    height: var(--scrollbar-size);
  }
  *::-webkit-scrollbar-track {
    background: hsl(var(--scrollbar-track));
    border-radius: 50px;
  }
  *::-webkit-scrollbar-thumb {
    background: hsl(var(--scrollbar-thumb));
    border-radius: 50px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--scrollbar-thumb-hover));
  }
}
```

## Teknik Detay

| Ozellik | Aciklama |
|---------|----------|
| `scrollbar-width: none` | Firefox'ta scrollbar'i gizler |
| `::-webkit-scrollbar { display: none }` | Chrome/Safari/Edge'de scrollbar'i gizler |
| `overflow` degismez | Kaydirma islevi aynen devam eder |
| Breakpoint: 768px | Tailwind'in `md` breakpoint'i ile uyumlu |

Sadece `src/index.css` degisecek.



# Mobil Scrollbar Sınırı Düzeltme Planı

## Sorun Analizi

Şu anki durum:
- Scroll işlemi `body/html` seviyesinde gerçekleşiyor
- Mobil bottom navbar `fixed` pozisyonda ama scroll alanı tüm ekranı kaplıyor
- Sonuç: Scrollbar thumb ekranın en altına kadar uzanıyor, navbar'ın arkasına giriyor

## Çözüm Yaklaşımı

Mobil görünümde "shell layout" yapısı uygulanacak:
1. Body/html scroll'u mobilde devre dışı bırakılacak
2. Scroll, içerik sarmalayıcısına (`main`) taşınacak
3. İçerik alanı yüksekliği: viewport - header - navbar

## Dosya Değişiklikleri

### 1. `src/index.css` - Mobil Body Scroll Kontrolü

Mobil cihazlarda body scroll'u devre dışı bırakmak için media query eklenecek:

```text
/* Mobilde body scroll'u kapat, scroll içerik alanına taşınacak */
@media (max-width: 767px) {
  html, body {
    height: 100%;
    overflow: hidden;
  }
}
```

### 2. `src/App.tsx` - Mobil Layout Yapısı

Mobil layout tam viewport yüksekliğinde olacak ve scroll sadece `main` içinde gerçekleşecek:

```text
// ÖNCE
<div className="min-h-screen flex flex-col md:hidden">
  <MobileHeader />
  <main 
    className="flex-1"
    style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
  >

// SONRA
<div className="h-[100dvh] flex flex-col md:hidden overflow-hidden">
  <MobileHeader />
  <main 
    className="flex-1 overflow-y-auto overflow-x-hidden"
    style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
  >
```

Değişiklikler:
- `min-h-screen` → `h-[100dvh]`: Dynamic viewport height (mobil URL bar'ı hesaba katar)
- `overflow-hidden` eklendi: Dış container'ın taşmasını engeller
- `main` elementine `overflow-y-auto overflow-x-hidden` eklendi: Scroll sadece burada

---

## Teknik Detaylar

### Neden `100dvh`?
- `100vh` mobil Safari'de URL bar yüzünden yanlış hesaplanıyor
- `100dvh` (dynamic viewport height) URL bar açık/kapalı durumuna göre ayarlanır
- Daha iyi mobil deneyim sağlar

### Scroll Hiyerarşisi (Sonrası)
```text
html, body (mobilde: height: 100%, overflow: hidden)
└── #root
    └── Desktop Layout (değişiklik yok)
    └── Mobil Layout (h-[100dvh], overflow-hidden)
        ├── MobileHeader (sticky/fixed)
        ├── main (flex-1, overflow-y-auto) ← SCROLL BURADA
        │   └── Page Content
        │   └── padding-bottom: navbar height
        └── MobileBottomNav (fixed bottom)
```

### Dosya Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/index.css` | +5 satır (mobil body scroll engelleme) |
| `src/App.tsx` | 2 satır güncelleme (mobil layout overflow) |

---

## Sonuç

Bu değişikliklerden sonra:
- Scrollbar thumb navbar'ın üstünde bitecek
- İçerik navbar'ın altına taşmayacak
- iOS Safari ve Android Chrome'da doğru davranış
- `safe-area-inset-bottom` desteği korunacak


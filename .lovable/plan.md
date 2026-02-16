

# UI Performans Optimizasyonu - Detayli Plan

## Tespit Edilen Sorunlar ve Cozumler

### 1. ParticleBackground - Surekli Canvas Animasyonu (YUKSEK ETKI)

**Sorun:** Hero section'daki ParticleBackground, her karede 30 parcacik cizer ve aralarindaki baglantilari hesaplar (O(n^2) karmasiklik). Bu, dusuk performansli cihazlarda ciddi kasmalara neden olur. Ayrica mobilde parcaciklar neredeyse gorulmuyor ama CPU harcanmaya devam ediyor.

**Cozum:**
- Mobilde (768px alti) parcacik sayisini 15'e dusur
- Baglanti cizimini tamamen kaldir (goruntusel etkisi az, CPU maliyeti yuksek)
- `requestAnimationFrame` yerine sayfa gorunur olmadiginda animasyonu durdur (Page Visibility API)
- `will-change: transform` kullanarak GPU hizlandirmasi ekle

**Dosya:** `src/components/ParticleBackground.tsx`

---

### 2. useMousePosition - Gereksiz Re-render (YUKSEK ETKI)

**Sorun:** Mouse her hareket ettiginde (16ms throttle ile bile) setState cagriliyor ve bu tum Index sayfasinin re-render olmasina neden oluyor. Mobilde mouse olmadigi icin tamamen gereksiz.

**Cozum:**
- `useRef` kullanarak DOM'u dogrudan guncelle (React re-render atla)
- Glow efekti icin ref-based DOM manipulasyonu kullan
- Mobilde hook'u tamamen devre disi birak

**Dosyalar:** `src/hooks/useMousePosition.tsx`, `src/pages/Index.tsx`

---

### 3. useScrollPosition - Her Scroll'da Re-render (YUKSEK ETKI)

**Sorun:** Index sayfasinda parallax icin her 16ms'de setState cagriliyor. Parallax efektleri 4 ayri `useMemo` ile hesaplaniyor ama her birisi scroll degistiginde tetikleniyor. Header'da da ayni hook kullaniliyor.

**Cozum:**
- Index.tsx'deki parallax icin `useRef` + dogrudan DOM style guncellemesi (CSS transform) kullan, setState kaldir
- Header'daki `isScrolled` kontrolu icin threshold bazli setState kullan (sadece sinir gecildiginde guncelle)

**Dosyalar:** `src/hooks/useScrollPosition.tsx`, `src/pages/Index.tsx`, `src/components/Header.tsx`

---

### 4. liquid-gradient Animasyonu - Surekli GPU Yuklemesi (ORTA ETKI)

**Sorun:** `liquid-gradient` class'i 400% boyutunda bir gradient'i 20 saniyede surekli kaydiriyor. `::before` pseudo-element'te ek bir glow-pulse animasyonu daha var. Bu iki kat GPU compositing demek.

**Cozum:**
- `::before` animasyonunu `prefers-reduced-motion` media query ile devre disi birak
- Ana animasyon suresini 20s'den 30s'ye cikararak GPU isini azalt
- Mobilde `background-size`'i 200%'ye dusur (daha az piksel hesaplamasi)

**Dosya:** `src/index.css`

---

### 5. Footer SVG Wave Animasyonu (ORTA ETKI)

**Sorun:** Footer'daki iki SVG path surekli `wave` ve `wave-reverse` animasyonlariyla hareket ediyor (15s ve 20s). Bu, Footer gorunmese bile GPU kaynaklarini tuketiyor.

**Cozum:**
- SVG animasyonlarini `IntersectionObserver` ile sadece Footer gorunur oldugunda calistir
- Veya daha basit: `animation-play-state: paused` varsayilan yap, gorunur oldugunda `running` yap

**Dosya:** `src/components/Footer.tsx`

---

### 6. Header'da Gereksiz Avatar Fetch (DUSUK ETKI)

**Sorun:** Header her mount oldugunda `supabase.from('profiles').select('avatar_url')` cagrisi yapiyor. Bu React Query cache'inden faydalanmiyor.

**Cozum:**
- Bu sorguyu `useQuery` ile sarmalayarak cache'den faydalandir
- `staleTime: 5 * 60 * 1000` ile gereksiz tekrar istekleri onle

**Dosya:** `src/components/Header.tsx`

---

### 7. MobileBottomNav - ResizeObserver + Framer Motion (DUSUK ETKI)

**Sorun:** `ResizeObserver` surekli dinliyor ve her resize'da `measurePill` cagriliyor. Framer Motion spring animasyonu da her tab degisiminde GPU'yu kullaniyor.

**Cozum:**
- `ResizeObserver` callback'ine debounce ekle (250ms)
- Spring animasyonunu `tween` ile degistir (daha hafif)

**Dosya:** `src/components/mobile/MobileBottomNav.tsx`

---

### 8. CSS will-change Kotu Kullanimi (DUSUK ETKI)

**Sorun:** `willChange: "transform"` birkac yerde surekli set edilmis. Bu, GPU'nun her zaman o element icin ayri bir katman olusturmasina neden olur ve bellek tuketir.

**Cozum:**
- `will-change` sadece hover/interaction sirasinda dinamik olarak eklenip kaldirilmali
- Veya CSS ile `@media (hover: hover)` ile sadece mouse olan cihazlarda aktif olacak

**Dosya:** `src/pages/Index.tsx`

---

### 9. Gorsel Onbellek Iyilestirmesi (ORTA ETKI)

**Sorun:** `imageOptimizer.ts`'deki fonksiyonlar aslinda hicbir optimizasyon yapmiyor - orijinal URL'i donduruyorlar. Bu, buyuk gorsellerin olduğu gibi yuklenmesi demek.

**Cozum:**
- Gorsel boyutlarini sorgu parametresi ile sinirla (eger Supabase Image Transformation aktifse)
- Aktif degilse, en azindan `<img>` elementlerine `sizes` ve `width`/`height` attribute'lari ekleyerek layout shift'i onle

**Dosyalar:** `src/pages/Index.tsx`, `src/pages/AllListings.tsx`, `src/pages/Explore.tsx`

---

### 10. Dual Routes Render Sorunu (ORTA ETKI)

**Sorun:** `App.tsx`'de desktop ve mobil icin IKI AYRI `<Routes>` blogu render ediliyor. Her ikisi de ayni route'lari isliyor, yani her sayfa degisikliginde route matching iki kez yapiliyor.

**Cozum:**
- Route'lari tek bir `<Routes>` bloguna tasiyip, layout'u (desktop vs mobile) wrapper component icinde handle et
- Bu hem route matching performansini hem de component tree karmasikligini azaltir

**Dosya:** `src/App.tsx`

---

## Uygulama Oncelikleri

| Oncelik | Degisiklik | Dosya | Beklenen Etki |
|---------|-----------|-------|---------------|
| 1 | useMousePosition ref-based | useMousePosition.tsx, Index.tsx | Re-render'lari %90 azalt |
| 2 | useScrollPosition ref-based (Index) | useScrollPosition.tsx, Index.tsx | Re-render'lari %90 azalt |
| 3 | ParticleBackground optimizasyonu | ParticleBackground.tsx | CPU kullanimi %50 azalt |
| 4 | Header scroll threshold | Header.tsx | Gereksiz re-render onle |
| 5 | liquid-gradient + wave animasyon | index.css, Footer.tsx | GPU yukunu azalt |
| 6 | Header avatar useQuery | Header.tsx | Gereksiz network istegi onle |
| 7 | Dual Routes birlestime | App.tsx | Route matching 2x -> 1x |
| 8 | will-change temizligi | Index.tsx | GPU bellek tasarrufu |
| 9 | MobileBottomNav debounce | MobileBottomNav.tsx | Gereksiz olcum azalt |
| 10 | Gorsel boyut attribute'lari | Index.tsx, AllListings.tsx | Layout shift onle |

## Degisecek Dosyalar

1. `src/hooks/useMousePosition.tsx`
2. `src/hooks/useScrollPosition.tsx`
3. `src/pages/Index.tsx`
4. `src/components/Header.tsx`
5. `src/components/ParticleBackground.tsx`
6. `src/components/Footer.tsx`
7. `src/components/mobile/MobileBottomNav.tsx`
8. `src/index.css`
9. `src/App.tsx`

## Onemli Not

Tasarimda HICBIR gorsel degisiklik yapilmayacak. Tum degisiklikler performans/mimari odakli olacak. Kullanici ayni gorunumu gorecek, sadece daha hizli ve akici.


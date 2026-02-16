
# Header Scroll Kasmasini Duzeltme

## Sorun Analizi

Header'da `isScrolled` state'i degistiginde su CSS transition'lar ayni anda tetikleniyor:

- `h-14` / `h-16` (layout reflow - en pahali islem)
- Logo `h-8 w-8` / `h-10 w-10` (layout reflow)
- Font-size `text-xl` / `text-2xl` (layout reflow)
- `max-h-0` / `max-h-4` + `opacity-0/100` (subtitle)
- `backdrop-blur-xl` / `backdrop-blur-md` (GPU compositing)
- `shadow-lg` / `shadow-sm` (paint)

Hepsi `transition-all` ile 300ms'de animasyonlu. `transition-all` tum CSS property'lerini izler ve her birinin degisip degismedigini kontrol eder — bu tek basina pahali.

## Cozum

**Dosya:** `src/components/Header.tsx`

1. **Height degisimini `transform: scale` ile degistir** — Header yuksekligini h-14/h-16 ile degistirmek yerine sabit h-16 yap ve icerik alaninda `transform: scaleY(0.875)` kullan. Transform layout reflow tetiklemez.

2. **Daha basit yaklasim: Transition'lari daralt** — `transition-all` yerine sadece gereken property'leri belirt:
   - Header: `transition-[background-color,border-color,box-shadow]` (backdrop-blur degisimini kaldir, sabit tut)
   - Icerik: Yukseklik degisimini tamamen kaldir, sabit `h-16` yap
   - Logo: Boyut degisimini kaldir, sabit `h-9 w-9` yap
   - Font: Boyut degisimini kaldir, sabit boyut yap
   - Subtitle: Gizleme animasyonunu `opacity` ile sinirla, `max-h` degisimini kaldir

3. **backdrop-blur degisimini kaldir** — `backdrop-blur-xl` ve `backdrop-blur-md` arasi gecis GPU'da pahali. Sabit `backdrop-blur-lg` kullan.

## Teknik Detay

Asil kasma kaynaklari:
- `transition-all` → `transition-[background-color,border-color,box-shadow,opacity]` ile degistir
- Header yuksekligi sabit `h-16` yap (h-14/h-16 gecisi layout reflow)
- Logo boyutu sabit `h-9 w-9` yap
- Font boyutu sabit yap
- `backdrop-blur` sabit `backdrop-blur-lg` yap
- Subtitle icin sadece `opacity` transition'i kullan

Bu degisikliklerle scroll gecisinde sadece renk/golge/opacity degisecek — layout reflow sifir, GPU isi minimum.

## Gorsel Etki

Kullanici neredeyse ayni gorunumu gorecek. Tek fark: scroll'da header yuksekligi ve logo boyutu artik kuculmuyor/buyumuyor. Bunun yerine sadece arka plan renginin koyulasmasi ve golgenin artmasi ile "scrolled" hissi verilecek.

## Degisecek Dosya

- `src/components/Header.tsx`

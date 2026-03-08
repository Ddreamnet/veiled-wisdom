

# Revize Edilmiş Mobil UI/UX Çözüm Planı

---

## 1. Mesaj Rozeti Kesiliyor

### Doğrulama
Badge pasif durumda `absolute -top-0.5 -right-0.5` ile konumlanıyor (satır 335). Parent zinciri:
- **Link** (satır 300): `overflow-hidden` — **kesilmenin doğrudan nedeni**
- **div.relative** (satır 309): icon wrapper, `w-5 h-5` — badge bu div'in dışına taşıyor ama Link kesiyor
- **containerRef div** (satır 261): `overflow` yok, sorun değil
- **nav** (satır 253): `overflow` yok, sorun değil

Tek kök neden: Link üzerindeki `overflow-hidden` (satır 300).

### Çözüm
1. Link'ten `overflow-hidden` kaldır
2. Icon wrapper div'i (satır 309) `relative` olarak koru (zaten öyle), badge'i bu div'in child'ı olarak konumlandır
3. Badge konumlandırmasını icon wrapper'a taşı: `absolute -top-2 -left-3` (icon'un sol üst köşesi)
4. Label text taşma koruması zaten mevcut (`text-ellipsis` + `max-w-[60px]` + span'deki `overflow-hidden`)

### Etkilenen dosya
`src/components/mobile/MobileBottomNav.tsx` — satır 300, 309, 330-339

### Regresyon riski
Label overflow: span'deki `overflow-hidden text-ellipsis` yeterli koruma sağlıyor. Link'ten kaldırılması soruna yol açmaz.

---

## 2. Swipe-Back Navigasyon

### iOS — Analiz ve Karar

`allowsBackForwardNavigationGestures: true` WKWebView'ın **browser history** tabanlı native gesture'ını aktifleştirir. Bu, SPA'daki `react-router-dom` history stack'i ile birebir eşleşir çünkü Capacitor WebView'da her `navigate()` çağrısı browser history'ye de push eder.

**Ancak riskler var:**
- Tab değiştirme (ör. Keşfet → Mesajlar → swipe-back) kullanıcıyı Keşfet'e geri götürür — bu beklenebilir ama tab-based app'lerde kafa karıştırıcı olabilir
- Root tab'da (ör. Ana Sayfa) swipe-back yapınca tamamen boş sayfa veya "about:blank" gösterilebilir (history başlangıcı)
- Programmatik `navigate(path, { replace: true })` kullanan yerlerde gesture beklenmedik yere götürebilir

**Karar:** iOS için de Android ile aynı kontrollü JS hook'unu kullan. Bu sayede:
- Root tab sayfalarında devre dışı
- Sol kenardan (0-30px) başlayan swipe koşulu
- Yatay scroll alanları hariç tutulur
- Her iki platformda tutarlı davranış

### Android + iOS — Birleşik Çözüm

Yeni hook: `src/hooks/useSwipeBack.ts`
- `touchstart`: `clientX < 30` ise swipe izlemeye başla
- `touchmove`: delta-X > 80px ve delta-Y < 50px ise swipe olarak işaretle
- `touchend`: swipe tamamlandıysa `navigate(-1)`, yoksa iptal
- **Devre dışı koşullar:**
  - Root tab paths: `/`, `/explore`, `/messages`, `/appointments`, `/profile`, `/admin/*`
  - Touch target veya ancestor'ı `overflow-x: auto/scroll` veya `scrollWidth > clientWidth` ise
  - Chat overlay açıkken (`isChatOpenAtom`)

Entegrasyon: `src/App.tsx` — mobil shell içinde `useSwipeBack()` çağır.

`capacitor.config.ts`'e `allowsBackForwardNavigationGestures` **eklenmeyecek** — kontrollü JS çözümü tercih edildi.

### Regresyon riski
Carousel/slider çakışması: Sol kenar koşulu (30px) ve scrollable ancestor kontrolü ile minimize edilir. Ek olarak, swipe sırasında visual feedback (opsiyonel, v2'de) yoksa kullanıcı ne olduğunu anlayamayabilir — şimdilik `navigate(-1)` yeterli.

---

## 3. iOS Notch / Safe Area

### Doğrulama
- `index.html` satır 5: `viewport-fit=cover` **yok** → `env(safe-area-inset-top)` her zaman `0` döner
- `MobileHeader` satır 106: `paddingTop: env(safe-area-inset-top)` kullanıyor ama değer 0
- `App.tsx` satır 99: Mobil shell `h-[100dvh]` div — safe area top padding yok

### Safe area hangi seviyede uygulanmalı?
**Header container'da** (MobileHeader). Nedeni:
- Shell div (`App.tsx` satır 99) `h-[100dvh]` flex container — burada padding eklemek tüm viewport yükseklik hesabını bozar
- Header zaten `sticky top-0` ile sabitlenmiş ve `paddingTop: env(safe-area-inset-top)` kodu mevcut
- `viewport-fit=cover` eklendikten sonra bu padding değeri otomatik olarak doğru notch yüksekliğini alacak

### Çifte boşluk riski
Header'da `h-14` sabit yükseklik var. `paddingTop` eklenince içerik sıkışır çünkü 56px içinde hem padding hem content sığmaya çalışır. Çözüm: `h-14` → `min-h-14` yapılacak, header yüksekliği safe area kadar artacak.

### Değişiklikler
1. `index.html` satır 5: `viewport-fit=cover` ekle
2. `MobileHeader.tsx` satır 103: `h-14` → `min-h-14`
3. `App.tsx`: değişiklik yok (shell seviyesinde padding eklenmeyecek)

### Video call header (satır 45-46)
Zaten `paddingTop: env(safe-area-inset-top)` kullanıyor ve sabit yükseklik yok — otomatik çalışacak.

### Regresyon riski
- Android'de `env(safe-area-inset-top)` genellikle 0 → değişiklik yok
- Bottom nav zaten `env(safe-area-inset-bottom)` kullanıyor (satır 255) → `viewport-fit=cover` ile artık gerçek değeri alacak, bu pozitif etki
- Web'de safe area 0 → değişiklik yok

---

## 4. iOS Chat Input Zoom

### Doğrulama
`MessageInput.tsx` satır 243: `text-sm` = 14px. iOS WKWebView 16px'ten küçük input/textarea'lara focus olunduğunda otomatik zoom yapar.

### Diğer focus alanları kontrolü
- MessageInput textarea: **`text-sm` (14px) — SORUNLU**
- RecordedPreview: input yok, sadece butonlar — sorun yok
- ChatWindow: input yok — sorun yok
- ConversationList: search input varsa kontrol gerekir

### Keyboard layout kayması
`MessageInput` zaten `paddingBottom: max(12px, env(safe-area-inset-bottom))` kullanıyor (satır 225). Mobile chat overlay `fixed inset-0` (Messages.tsx satır 123). iOS keyboard açılınca `100dvh` zaten küçülür — bu yapı keyboard'a doğru adapte olur. Ayrı bir layout kayması sorunu yok; zoom'u engellemek yeterli.

### Çözüm
`MessageInput.tsx` satır 243: `text-sm` → `text-base` (16px)

### Regresyon riski
Metin biraz daha büyük görünecek, ama chat input için 16px standart ve daha okunabilir. Placeholder da aynı boyutta olacak.

---

## Uygulama Sırası

1. **iOS Notch** — `index.html` + `MobileHeader.tsx` (temel, diğer safe area'ların çalışmasını sağlar)
2. **Chat Zoom** — `MessageInput.tsx` (tek satır)
3. **Badge** — `MobileBottomNav.tsx` (overflow + badge konumlandırma)
4. **Swipe-back** — yeni `useSwipeBack.ts` + `App.tsx` entegrasyonu

### Değişecek dosyalar
- `index.html` — viewport-fit=cover
- `src/components/mobile/MobileHeader.tsx` — min-h-14
- `src/components/chat/MessageInput.tsx` — text-base
- `src/components/mobile/MobileBottomNav.tsx` — overflow fix + badge repositioning
- `capacitor.config.ts` — değişiklik yok
- Yeni: `src/hooks/useSwipeBack.ts`
- `src/App.tsx` — useSwipeBack hook entegrasyonu


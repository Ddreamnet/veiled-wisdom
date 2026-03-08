

# Revize Plan: Messages Header + Bottom Nav Fix

---

## Mevcut Sorun Yapısı

**Messages sayfası neden global header'dan ayrılmış?**

`MobileHeaderWrapper` (App.tsx satır 61-64) `/messages` path'inde `MobileHeader`'ı tamamen gizliyor. Messages sayfası kendi local header'ını render ediyor (satır 138-142) çünkü:
1. "Mesajlar" başlığı + "3 konuşma" alt yazısı göstermek istiyor
2. Mevcut `MobileHeader` sadece `title` prop'u destekliyor, subtitle/alt içerik desteği yok

Bu ayrışma, safe area zincirini kırıyor çünkü `paddingTop: env(safe-area-inset-top)` sadece `MobileHeader`'da var.

---

## Tercih Edilen Çözüm: Messages'ı Global Sisteme Geri Al

### 1. MobileHeader'a subtitle desteği ekle

`MobileHeaderProps`'a `subtitle?: string` ekle. Header'da `displayTitle` gösterildiğinde altına küçük bir subtitle satırı render et.

```
interface MobileHeaderProps {
  title?: string;
  subtitle?: string;   // YENİ
  showBackButton?: boolean;
  className?: string;
}
```

Title + subtitle birlikte center'da gösterilecek. Subtitle yoksa mevcut davranış korunur.

### 2. MobileHeaderWrapper'ı güncelle

`/messages` istisnasını kaldır. Bunun yerine Messages sayfası için title/subtitle bilgisini geçir. Ancak `MobileHeaderWrapper` şu an prop almıyor ve route-based rendering yapıyor.

İki seçenek:
- **A)** `MobileHeaderWrapper`'ı kaldırıp `MobileHeader`'ı her zaman render et. `MobileHeader` zaten route'a göre title belirliyor (`getDefaultTitle`). `/messages` path'i için `getDefaultTitle`'a "Mesajlar" döndürmesini ekle. Subtitle için ise `MobileHeader`'ın kendi içinde route-specific subtitle render etmesi gerekir — bu header'ı page logic'e bağlar, **istenmeyen bağımlılık**.
- **B)** `MobileHeaderWrapper`'ı kaldırıp, Messages sayfasının subtitle bilgisini bir atom veya context ile global header'a iletmesi — **overengineering**.
- **C) En temiz:** `MobileHeaderWrapper`'daki `/messages` istisnasını kaldır. `MobileHeader`'ın `getDefaultTitle`'ına `/messages` → "Mesajlar" ekle. Subtitle'ı şimdilik bırak (sadece title yeterli). Messages sayfasındaki local header'ı (satır 138-143) tamamen kaldır.

**Tercih: C yaklaşımı.** Nedeni:
- "3 konuşma" alt yazısı kritik bir bilgi değil, kaldırılması UX'i bozmaz
- Safe area tek merkezden yönetilir
- Minimum değişiklik, sıfır yeni abstraction
- Eğer ileride subtitle gerekirse `MobileHeader`'a prop eklemek kolay

### 3. Messages sayfası local header kaldırılabilir mi?

**Evet.** Local header sadece "Mesajlar" başlığı + "X konuşma" sayısını gösteriyor. Başlık `MobileHeader` tarafından otomatik gösterilebilir. Konuşma sayısı opsiyonel bilgi.

Messages mobil container'ı (satır 133-152) şu hale gelir:
- Local header div'i kaldırılır
- `ConversationList` doğrudan flex-1 alanı doldurur
- Height hesabı `MobileHeader` yüksekliğini de hesaba katmalı (zaten `flex-1` ile App shell'den alıyor)

**Önemli:** Messages mobile container şu an kendi height'ını hesaplıyor: `height: calc(100dvh - 80px - env(safe-area-inset-bottom))`. Bu, App shell'in `<main>` flex yapısıyla çakışıyor. Local header kaldırıldığında bu sabit height'a da gerek kalmaz — normal akışta `<main>` flex-1 + overflow-y-auto zaten doğru yüksekliği verir.

### Yapılacak değişiklikler:

**`src/components/mobile/MobileHeader.tsx`:**
- `getDefaultTitle` fonksiyonuna `/messages` → "Mesajlar" ekle

**`src/App.tsx`:**
- `MobileHeaderWrapper`'daki `/messages` kontrolünü kaldır (her zaman `MobileHeader` render et)

**`src/pages/Messages.tsx`:**
- Mobil conversation list bölümündeki local header div'i (satır 138-143) kaldır
- Container'daki sabit height style'ı kaldır, `h-full` veya `flex-1` ile değiştir (App shell'in main alanı zaten doğru boyutu veriyor)

---

## Bottom Nav Fix (Değişiklik Yok)

**`src/components/mobile/MobileBottomNav.tsx`:**
- `paddingBottom: env(safe-area-inset-bottom)` → `<nav>`'dan iç `<div>`'e (background div) taşı
- Nav elemanından style kaldır, iç div'e ekle
- Arka plan rengi safe area alanını da kaplar, bar tabana yapışık görünür

---

## Uygulama Sırası

1. **MobileHeader** — `/messages` title desteği ekle
2. **App.tsx** — `/messages` istisnasını kaldır
3. **Messages.tsx** — local header ve sabit height kaldır
4. **MobileBottomNav.tsx** — safe area padding'i iç div'e taşı

## Riskler

- Messages sayfasında "X konuşma" bilgisi kaybolur — düşük etki, kabul edilebilir
- Messages container'ın height hesabı değişiyor — App shell'in flex yapısı zaten doğru boyutlandırma sağlıyor, test ile doğrulanmalı
- Bottom nav fix Android'de nötr (inset 0), iOS'ta pozitif etki


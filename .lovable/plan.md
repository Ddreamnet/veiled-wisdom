
# Build Hatası Düzeltme ve Capacitor Hazırlık Planı

## Sorun Analizi

### Kök Sebep: Vite/Rollup Modül Çözümleme Davranışı

Hata mesajı:
```
No matching export in "src/components/Header.tsx" for import "getCenterNavItems"
No matching export in "src/components/Header.tsx" for import "UserDropdownMenu"
```

**Sorun:** `Header.tsx` dosyasında şu import var:
```typescript
import { getCenterNavItems, UserDropdownMenu } from "@/components/header";
```

Vite/Rollup, `@/components/header` yolunu çözümlerken **önce dosya, sonra klasör** önceliği uyguluyor:
1. `src/components/header.tsx` → Bulunamadı
2. `src/components/Header.tsx` → **BULUNDU** (Windows case-insensitive)
3. `src/components/header/index.ts` → Hiç denenmedi

Windows'ta büyük/küçük harf duyarsız olduğu için `header` → `Header.tsx` olarak çözümleniyor ve bu dosyada `getCenterNavItems` veya `UserDropdownMenu` export'u olmadığı için hata veriyor.

Linux/Android'de ise farklı davranış gösterebilir.

## Çözüm Planı

### 1. Import Yolunu Açık Hale Getir

`Header.tsx` içindeki import'u klasör index'ine açıkça yönlendir:

```typescript
// ÖNCEKİ (sorunlu)
import { getCenterNavItems, UserDropdownMenu } from "@/components/header";

// SONRAKI (düzeltilmiş)
import { getCenterNavItems, UserDropdownMenu } from "@/components/header/index";
```

Bu, Vite'ın `Header.tsx` yerine `header/index.ts`'i kullanmasını garanti eder.

### 2. Capacitor Yapılandırması

#### A) `capacitor.config.ts` Oluştur

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c391e7536d1545ab929ee1c102409f72',
  appName: 'veiled-wisdom',
  webDir: 'dist',
  server: {
    // Development için hot-reload (production'da kaldırılmalı)
    url: 'https://c391e753-6d15-45ab-929e-e1c102409f72.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
```

#### B) `vite.config.ts` Güncelle

SPA + Capacitor uyumu için `base: './'` ekle:

```typescript
export default defineConfig(({ mode }) => ({
  base: './',  // Capacitor için relative path
  // ... mevcut config
}));
```

#### C) `package.json` Script'leri Ekle

```json
{
  "scripts": {
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android",
    "cap:open:ios": "npx cap open ios",
    "cap:run:android": "npx cap run android",
    "cap:run:ios": "npx cap run ios"
  }
}
```

### 3. Router Değerlendirmesi

Mevcut `react-router-dom` ile `BrowserRouter` kullanılıyor. Capacitor WebView içinde:
- **Deep link sorunu yok** çünkü SPA tek index.html üzerinden çalışır
- **Refresh sorunu olabilir** ancak Capacitor WebView varsayılan olarak SPA-friendly çalışır

Eğer sorun yaşanırsa `HashRouter` alternatifi düşünülebilir, ancak şimdilik gerekli değil.

## Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/components/Header.tsx` | Import yolunu `/header/index` olarak düzelt |
| `vite.config.ts` | `base: './'` ekle |
| `package.json` | Capacitor script'leri ekle |
| `capacitor.config.ts` | Yeni dosya oluştur |

## Teknik Detaylar

### Header.tsx Değişikliği (Satır 11)

```typescript
// Önceki
import { getCenterNavItems, UserDropdownMenu } from "@/components/header";

// Sonraki
import { getCenterNavItems, UserDropdownMenu } from "@/components/header/index";
```

### vite.config.ts Değişikliği (Satır 7-8)

```typescript
export default defineConfig(({ mode }) => ({
  base: './',  // YENİ SATIR
  server: {
    // ...
```

### package.json Scripts Ekleme

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "cap:sync": "npx cap sync",
  "cap:open:android": "npx cap open android",
  "cap:open:ios": "npx cap open ios",
  "cap:run:android": "npx cap run android",
  "cap:run:ios": "npx cap run ios"
}
```

### capacitor.config.ts (Yeni Dosya)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c391e7536d1545ab929ee1c102409f72',
  appName: 'veiled-wisdom',
  webDir: 'dist',
  server: {
    url: 'https://c391e753-6d15-45ab-929e-e1c102409f72.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
```

## Lokal Kurulum Adımları (Senin Yapacakların)

Repo güncellemesini çektikten sonra:

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Build test et
npm run build

# 3. Capacitor CLI ve Core yükle
npm install @capacitor/core @capacitor/cli

# 4. Capacitor'ı başlat (config dosyası zaten olacak)
npx cap init --web-dir dist

# 5. Android platform ekle
npx cap add android

# 6. Sync et
npm run cap:sync

# 7. Android Studio'da aç
npm run cap:open:android
```

## Test Kriterleri

1. `npm run dev` hatasız çalışmalı
2. `npm run build` başarılı olmalı
3. `dist/` klasörü oluşmalı ve `index.html` içinde relative path'ler olmalı
4. Capacitor komutları çalışmalı


# Görüntülü Arama Bağlantı Süresini Kısaltma Planı

## Mevcut Durum Analizi

Şu anki bağlantı süreci (8-10 saniye) aşağıdaki adımlardan oluşuyor:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MEVCUT AKIŞ (8-10 saniye)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. VideoCallPage mount (~50ms)                                            │
│     └─> Daily.createCallObject()                                           │
│                                                                             │
│  2. PARALEL İşlemler (~2-4 sn) ─────────────────────────────────────────── │
│     ├─> Edge Function çağrısı (create-daily-room)                          │
│     │   ├─> JWT doğrulama                                                  │
│     │   ├─> Supabase conversation fetch                                    │
│     │   ├─> Active call kontrolü                                           │
│     │   ├─> Daily API: POST /rooms (oda oluşturma)                         │
│     │   └─> Daily API: GET /rooms/{name} (doğrulama)                       │
│     ├─> getDisplayName()                                                   │
│     └─> supabase.auth.getUser()                                            │
│                                                                             │
│  3. startCamera() (~1-2 sn)                                                │
│     └─> getUserMedia izin isteme                                           │
│                                                                             │
│  4. call.join() (~4-6 sn) ─────────────────────────────────────────────────│
│     ├─> WebRTC bağlantısı kurma                                            │
│     ├─> ICE candidate toplama                                              │
│     ├─> DTLS handshake                                                     │
│     └─> Media track'lerin aktif hale gelmesi                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tespit Edilen Darboğazlar

| # | Darboğaz | Süre | Açıklama |
|---|----------|------|----------|
| 1 | Edge Function soğuk başlatma | ~1-2 sn | Fonksiyon ilk kez çağrıldığında soğuk başlatma gecikmesi |
| 2 | Daily API çağrıları | ~1-2 sn | Oda oluşturma + doğrulama için 2 sıralı HTTP isteği |
| 3 | getUserMedia izni | ~0.5-1 sn | Kullanıcıdan kamera/mikrofon izni isteme (ilk kullanımda) |
| 4 | WebRTC bağlantısı | ~3-5 sn | ICE toplama, DTLS handshake, media negotiation |
| 5 | Sıralı işlemler | ~1-2 sn | Bazı işlemler hala sıralı çalışıyor |

## Önerilen Optimizasyonlar

### 1. Kamera İznini Önceden Al (Prefetch Media Permissions)

**Sorun**: `startCamera()` ve `getUserMedia()` arama başladıktan sonra çağrılıyor.

**Çözüm**: ChatWindow'da "Görüntülü Ara" butonuna hover/focus edildiğinde veya mesajlaşma sayfası açıldığında kamera iznini önceden iste.

```typescript
// ChatWindow.tsx - Hover'da izin prefetch
const prefetchMediaPermissions = useCallback(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: true 
    });
    stream.getTracks().forEach(t => t.stop());
  } catch { }
}, []);

<Button onMouseEnter={prefetchMediaPermissions} onFocus={prefetchMediaPermissions}>
  <Video /> Görüntülü Ara
</Button>
```

### 2. Daily preAuth() Kullanımı

**Sorun**: `join()` çağrısı WebRTC bağlantısını başlatmadan önce bazı ön hazırlıklar yapıyor.

**Çözüm**: Daily.co'nun `preAuth()` metodunu kullanarak room URL alındıktan hemen sonra ön kimlik doğrulama yap.

```typescript
// Room URL alındıktan sonra, join()'den ÖNCE
await call.preAuth({ url: roomUrl });
// Bu, join() süresini kısaltır
```

### 3. Edge Function Optimizasyonu - Doğrulama Adımını Kaldır

**Sorun**: Edge function oda oluşturduktan sonra ayrı bir GET isteği ile doğruluyor (~500ms ekstra).

**Çözüm**: Daily API'nin POST yanıtı zaten başarılı oda bilgisini içeriyor, doğrulama adımını kaldır.

```typescript
// create-daily-room/index.ts - Satır 370-381 arası kaldırılabilir
// Verify adımı sadece aktif aramalar için gerekli, yeni oda için gereksiz
```

### 4. startCamera() ile preAuth() Paralel Çalıştır

**Sorun**: `startCamera()` fire-and-forget olarak çalışıyor ama `join()`'i beklemiyor.

**Çözüm**: `startCamera({ url })` ve `preAuth()` paralel çalıştırılabilir:

```typescript
// Room URL alındıktan sonra
await Promise.all([
  call.startCamera({ url: roomUrl }),
  call.preAuth({ url: roomUrl }),
]);

// Artık join() çok daha hızlı olacak
await call.join({ url: roomUrl, ... });
```

### 5. Join Intent İçin Joiner Shortcut Geliştirmesi

**Sorun**: Mevcut "joiner shortcut" sadece roomUrl'i geçiriyor ama edge function hala çağrılıyor (room kontrolü için).

**Çözüm**: Joiner için edge function çağrısını tamamen atla, doğrudan join yap:

```typescript
// VideoCallPage.tsx
if (roomUrlFromParam && intent === 'join') {
  // Edge function'ı ATLAMA - doğrudan join
  const roomUrl = roomUrlFromParam;
  await call.preAuth({ url: roomUrl });
  await call.join({ url: roomUrl, ... });
}
```

### 6. Edge Function Soğuk Başlatmayı Önleme (Keep-Warm)

**Sorun**: Edge function soğuk başlatma 1-2 saniye ekliyor.

**Çözüm**: Mesajlaşma sayfasında arka planda düşük maliyetli bir "ping" isteği at:

```typescript
// useActiveCall hook'unda veya Messages sayfasında
useEffect(() => {
  // Edge function'ı ısıt (boş bir OPTIONS isteği yeterli)
  supabase.functions.invoke('create-daily-room', {
    method: 'OPTIONS' // CORS preflight = soğuk başlatmayı tetikler
  }).catch(() => {});
}, []);
```

## Uygulama Planı

### Faz 1: Hızlı Kazanımlar (Tahmini: 2-3 sn kazanç)

| Dosya | Değişiklik |
|-------|------------|
| `ChatWindow.tsx` | Hover'da `getUserMedia` prefetch |
| `VideoCallPage.tsx` | `preAuth()` kullanımı |
| `VideoCallPage.tsx` | `startCamera({ url })` ile URL geçme |

### Faz 2: Edge Function Optimizasyonu (Tahmini: 0.5-1 sn kazanç)

| Dosya | Değişiklik |
|-------|------------|
| `create-daily-room/index.ts` | Yeni oda için verify adımını kaldır |
| `VideoCallPage.tsx` | Joiner shortcut'ta edge function'ı tamamen atla |

### Faz 3: Gelişmiş Optimizasyonlar (Tahmini: 0.5-1 sn kazanç)

| Dosya | Değişiklik |
|-------|------------|
| `Messages.tsx` veya `useActiveCall.ts` | Edge function keep-warm ping |
| `ChatWindow.tsx` | Aktif arama varsa roomUrl'i state'te tut |

## Beklenen Sonuç

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPTİMİZE AKIŞ (3-5 saniye hedef)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Ön Hazırlık (Kullanıcı mesajlaşma sayfasındayken):                        │
│  ├─> getUserMedia izni (hover'da) - ÖNBELLEĞE ALINIR                       │
│  └─> Edge function keep-warm - SOĞUK BAŞLATMA ÖNLENİR                      │
│                                                                             │
│  Arama Başlatıldığında:                                                    │
│                                                                             │
│  1. createCallObject() + Edge Function PARALEL (~1-2 sn)                   │
│                                                                             │
│  2. preAuth() + startCamera() PARALEL (~0.5 sn)                            │
│                                                                             │
│  3. join() (~2-3 sn) - preAuth sayesinde daha hızlı                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Teknik Detaylar

### Değiştirilecek Dosyalar

1. **`src/components/chat/ChatWindow.tsx`**
   - Video butonu hover/focus event'leri
   - Media permission prefetch

2. **`src/pages/VideoCall/VideoCallPage.tsx`**
   - `preAuth()` entegrasyonu
   - `startCamera({ url })` güncellemesi
   - Joiner shortcut iyileştirmesi

3. **`supabase/functions/create-daily-room/index.ts`**
   - Yeni oda için verify adımını kaldırma (opsiyonel)

4. **`src/hooks/useActiveCall.ts`** (opsiyonel)
   - Edge function keep-warm mekanizması

### Risk Değerlendirmesi

| Risk | Seviye | Açıklama |
|------|--------|----------|
| preAuth() uyumsuzluğu | Düşük | Daily.co resmi API'si, iyi destekleniyor |
| Prefetch yanlış pozitif | Düşük | Hover'da izin alınırsa kullanıcı kafası karışabilir |
| Edge function değişikliği | Orta | Verify kaldırılırsa edge case'ler oluşabilir |

## Test Kriterleri

1. Arama başlatma süresi 8-10 sn'den 4-5 sn'ye düşmeli
2. Katılma süresi (joiner) 3 sn'nin altına inmeli
3. Mevcut tüm fonksiyonellik korunmalı
4. Hata durumlarında graceful fallback olmalı

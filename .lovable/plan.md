
# Görüntülü Arama Bağlantı Süresini Kısaltma Planı

## Tespit Edilen Sorunlar

### 1. Edge Function Güncellenmemiş (Ana Sorun)
Network response'da görülen `function_version: "create-daily-room@2026-01-29-REV3"` kod tabanındaki `REV5-FAST-INIT` ile uyuşmuyor. Yeni optimize edilmiş Edge Function **deploy edilmemiş**.

- Eski fonksiyon hala "verify" adımını çalıştırıyor (`verified: true` görülüyor)
- Edge Function tek başına ~6 saniye sürüyor

### 2. preAuth 3 Saniye Kaybettiriyor
Log: `[VideoCall] preAuth skipped: preAuth timeout`

`preAuth` her zaman timeout oluyor ve kod şu anda timeout'u **bekliyor**:
```typescript
await preAuthPromise;  // 3 saniye kaybediliyor!
```

### 3. Çift Edge Function Çağrısı
Aynı saniye içinde iki `create-daily-room` POST isteği görülüyor. Muhtemelen React StrictMode double-mount veya mutex mantık hatası.

### 4. WebRTC Bağlantı Süresi
`join()` çağrısı kendi başına 4-6 saniye sürebiliyor (ICE toplama, DTLS handshake).

## Mevcut Zamanlama Analizi (13 saniye)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     MEVCUT AKIŞ (13 saniye)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Edge Function (YAYINLANMAMIŞ ESKİ VERSİYON)     ~6 saniye           │
│     ├─> JWT doğrulama                                                    │
│     ├─> Supabase conversation fetch                                      │
│     ├─> Daily API: POST /rooms                                           │
│     ├─> Daily API: GET /rooms (VERIFY - ESKİ)      +500ms ekstra        │
│     └─> DB update                                                        │
│                                                                          │
│  2. preAuth timeout bekleme                         +3 saniye            │
│     └─> Her zaman timeout oluyor ama bekleniyor                         │
│                                                                          │
│  3. join() WebRTC bağlantısı                        ~4 saniye            │
│     ├─> ICE candidate toplama                                            │
│     ├─> DTLS handshake                                                   │
│     └─> Media negotiation                                                │
│                                                                          │
│  TOPLAM                                             ~13 saniye           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Çözüm Planı

### Faz 1: preAuth Bekleme Mantığını Düzelt (Anında 3 sn kazanç)

**Sorun**: `await preAuthPromise` satırı, timeout olsa bile 3 saniye bekliyor.

**Çözüm**: preAuth'u tamamen fire-and-forget yap, join() işlemini bloklamamalı.

```typescript
// ÖNCEKİ (sorunlu)
await preAuthPromise;  // 3 saniye bekliyor
await call.join(...);

// SONRAKİ (optimize)
// preAuth fire-and-forget olarak devam etsin, join'i beklemesin
call.preAuth({ url: roomUrl }).catch(() => {});
call.startCamera({ url: roomUrl }).catch(() => {});
await call.join(...);  // Direkt join
```

### Faz 2: Edge Function'ı Publish Et (2-3 sn kazanç)

**Sorun**: Yeni Edge Function kodu canlıda değil.

**Çözüm**: Edge Function'ın yeniden deploy edilmesi gerekiyor. Ama Lovable bunu otomatik yapmalıydı. Fonksiyonu hafifçe güncelleyerek yeniden deploy tetikleyebiliriz.

### Faz 3: Edge Function Warm-Up Ping'ini Düzelt

**Sorun**: Mevcut OPTIONS ping'i Edge Function'ı gerçekten ısıtmıyor olabilir (CORS preflight Deno'da function kodunu çalıştırmayabilir).

**Çözüm**: Gerçek bir POST isteği at (minimal body ile).

```typescript
// OPTIONS yerine gerçek bir warm-up POST
fetch(`${supabaseUrl}/functions/v1/create-daily-room`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
  },
  body: JSON.stringify({ warmup: true }),
}).catch(() => {});
```

Edge Function'da warmup isteğini erken kesebiliriz:
```typescript
// create-daily-room/index.ts başında
if (body?.warmup === true) {
  return jsonResponse({ warmed: true, function_version: FUNCTION_VERSION });
}
```

### Faz 4: Paralel İşlemleri Gerçekten Paralel Yap

**Mevcut Durum**: `createRoom`, `getDisplayName`, `getUser` paralel çalışıyor ✓

**Eksik**: `startCamera` ve `join` sıralı çalışıyor.

**Çözüm**: Daily.co'ya göre, `join()` zaten `startCamera()`'yı içeriyor. Ayrıca çağırmaya gerek yok:

```typescript
// startCamera'yı kaldır, join yeterli
await call.join({
  url: roomUrl,
  userName: displayName,
  startVideoOff: false,
  startAudioOff: false,
});
```

## Hedef Zamanlama (4-6 saniye)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    OPTİMİZE AKIŞ (4-6 saniye)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ÖN HAZIRLIK (Mesajlaşma sayfasında):                                   │
│  ├─> Edge Function warm-up (gerçek POST)                                │
│  └─> getUserMedia izni (hover'da)                                       │
│                                                                          │
│  ARAMA BAŞLATILDIĞINDA:                                                 │
│                                                                          │
│  1. Edge Function (YENİ VERSİYON, verify yok)      ~2-3 saniye          │
│                                                                          │
│  2. join() (preAuth beklemeden)                     ~2-3 saniye          │
│     └─> startCamera + WebRTC bağlantısı dahil                           │
│                                                                          │
│  TOPLAM                                             ~4-6 saniye          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Yapılacak Değişiklikler

| Dosya | Değişiklik | Beklenen Kazanç |
|-------|------------|-----------------|
| `VideoCallPage.tsx` | preAuth await'ini kaldır, fire-and-forget yap | 3 saniye |
| `VideoCallPage.tsx` | startCamera'yı kaldır (join içinde var) | 0.5 saniye |
| `useActiveCall.ts` | OPTIONS yerine POST warm-up | 1-2 saniye |
| `create-daily-room/index.ts` | warmup early-return ekle | Deploy tetikleme |

## Teknik Detaylar

### VideoCallPage.tsx Değişiklikleri

Satır 225-253 arası tamamen yeniden yazılacak:

```typescript
// OPTIMIZATION: preAuth ve startCamera fire-and-forget
// join() zaten bunları içeriyor, ayrıca beklemeye gerek yok
devLog('VideoCall', 'Starting parallel preparation (non-blocking)');

// Fire-and-forget - join'i bloklama
call.preAuth({ url: roomUrl }).then(() => {
  devLog('VideoCall', 'preAuth completed (non-blocking)');
}).catch(() => {});

// Join timeout'u ayarla
joinTimeout = window.setTimeout(() => {
  if (!isMounted) return;
  setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.');
}, JOIN_TIMEOUT_MS);

// Event listeners
call.on('joined-meeting', () => {
  devLog('VideoCall', 'Successfully joined meeting');
  if (joinTimeout) window.clearTimeout(joinTimeout);
});

call.on('error', (e) => {
  console.error('[VideoCall] Daily call error:', e);
  if (joinTimeout) window.clearTimeout(joinTimeout);
  if (!isMounted) return;
  setError('Bağlantı hatası oluştu');
});

// Direkt join - preAuth'u bekleme
devLog('VideoCall', 'Attempting to join room (without waiting preAuth)');
await call.join({
  url: roomUrl,
  userName: displayName,
  userData: user?.id ? { appUserId: user.id } : undefined,
  startVideoOff: false,
  startAudioOff: false,
  sendSettings: {
    video: { maxQuality: 'high' as const },
  },
});
```

### useActiveCall.ts Değişiklikleri

Satır 82-94 arası:

```typescript
// OPTIMIZATION: Warm up edge function with a real POST request
// OPTIONS may not trigger actual function execution in Deno
if (!edgeFunctionWarmedUp && conversationId) {
  edgeFunctionWarmedUp = true;
  
  supabase.functions.invoke('create-daily-room', {
    body: { warmup: true },
  }).catch(() => {
    // Ignore errors - this is just a warm-up ping
  });
  
  console.log('[useActiveCall] Edge function warm-up POST sent');
}
```

### create-daily-room/index.ts Değişiklikleri

Satır 177 civarına (body parse'dan sonra):

```typescript
// OPTIMIZATION: Early return for warm-up requests
if (body?.warmup === true) {
  console.log('[create-daily-room] Warm-up request received');
  return jsonResponse({ 
    success: true, 
    warmed: true, 
    function_version: FUNCTION_VERSION 
  });
}
```

## Test Kriterleri

1. preAuth timeout logları görülmemeli (fire-and-forget olduğu için)
2. Edge Function response'da `REV5-FAST-INIT` veya daha yeni versiyon görülmeli
3. Toplam bağlantı süresi 4-6 saniyeye düşmeli
4. Arama başlatma ve katılma fonksiyonları sorunsuz çalışmalı

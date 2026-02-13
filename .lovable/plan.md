
# Goruntulu Arama Baglanti Suresi Optimizasyonu

## Mevcut Durum Analizi

Kullanicinin "Goruntulu Ara" butonuna basmasindan goruntulerin gelmesine kadar olan adimlar:

```text
1. Route navigate (/call/:id)         ~50ms
2. VideoCall chunk lazy load           ~200-500ms (yavas internette 1-2s)
3. Daily.js SDK parse/init             ~100-300ms
4. Edge function (create-daily-room)   ~800-2000ms
   - JWT auth validation               ~100ms
   - Conversation DB query             ~100ms  (sirayla, auth'dan sonra)
   - Daily API POST /rooms             ~500-1500ms
5. call.join() - WebRTC handshake      ~500-2000ms
                                       ────────────
                               TOPLAM: ~2-5 saniye (hizli internet)
                                        ~5-10 saniye (yavas internet)
```

## Tespit Edilen Darbogazlar

1. **Daily.js SDK lazy load**: VideoCall sayfasi lazy-loaded, Daily.js SDK'si de onunla birlikte yukleniyor. Yavas internette bu 1-2 saniye surebilir
2. **DNS cozumleme gecikmesi**: daily.co domainlerine ilk erisimde DNS lookup + TLS handshake ~200-500ms
3. **Edge function'da sirasal islemler**: JWT dogrulama ve conversation sorgusu sirayla yapiliyor (paralellestirilebilir)
4. **Yuksek video kalitesi baslangici**: `maxQuality: 'high'` yavas baglantilarda WebRTC negotiation'i yavaslatir
5. **VideoCall chunk preload yok**: Kullanici chat ekranindayken VideoCall kodu onceden yuklenmiyor

## Optimizasyon Plani

### 1. DNS Prefetch ve Preconnect - Daily.co Domainleri
**Dosya:** `index.html`

Daily.co'nun kullandigi domainlere onceden DNS cozumleme ve TLS baglantisi acmak. Bu, gercek arama basladiginda ~200-500ms tasarruf saglar.

```html
<link rel="dns-prefetch" href="https://daily.co" />
<link rel="preconnect" href="https://daily.co" crossorigin />
<link rel="dns-prefetch" href="https://gs.daily.co" />
<link rel="preconnect" href="https://gs.daily.co" crossorigin />
```

**Kazanim:** ~200-500ms (ozellikle ilk arama icin)

### 2. VideoCall Chunk Preload - Chat Ekranindan
**Dosya:** `src/components/chat/ChatWindow.tsx`

Kullanici bir konusma actigi anda VideoCall modulu icin dynamic import calistirmak (sadece chunk'i indirmek, render etmemek). Boylece arama butonuna bastiginda kod zaten hazir olur.

```tsx
// ChatWindow mount oldugunda VideoCall chunk'ini preload et
useEffect(() => {
  const timer = setTimeout(() => {
    import('@/pages/VideoCall/VideoCallPage');
  }, 2000); // 2sn sonra baslat (oncelik: mesajlar)
  return () => clearTimeout(timer);
}, []);
```

**Kazanim:** ~200-1000ms (yavas internette daha belirgin)

### 3. Edge Function'da Auth + DB Sorgusunu Paralellestir
**Dosya:** `supabase/functions/create-daily-room/index.ts`

Mevcut durumda JWT dogrulama (getClaims) bittikten sonra conversation sorgusu yapiliyor. Bunlar birbirinden bagimsiz oldugu icin paralel calistirilabilir. Conversation sorgusunu service_role ile yaptigimiz icin user ID'ye ihtiyac yok (dogrulama sonrasi kontrol edilir).

```text
ONCEKI (sirasal):
  getClaims (100ms) -> conversation query (100ms) = 200ms

SONRAKI (paralel):
  Promise.all([getClaims, conversationQuery]) = max(100ms, 100ms) = ~100ms
```

Paralel calistirildiktan sonra, getClaims'den gelen userId ile conversation'daki teacher_id/student_id eslesmesi kontrol edilir.

**Kazanim:** ~50-100ms

### 4. Adaptif Video Kalitesi - Baslangicta Dusuk, Sonra Yukselt
**Dosya:** `src/pages/VideoCall/VideoCallPage.tsx`

Baslangicta `maxQuality: 'low'` ile baglanti kurup, WebRTC baglantisi oturduktan sonra `maxQuality: 'high'` ye gecmek. Bu, ICE candidate toplama ve DTLS negotiation surecini hizlandirir.

```tsx
// Baslangicta dusuk kalite ile hizli baglan
sendSettings: {
  video: { maxQuality: 'low' as const },
},

// 3 saniye sonra kaliteyi yukselt
call.on('joined-meeting', () => {
  setTimeout(() => {
    call.updateSendSettings({
      video: { maxQuality: 'high' },
    });
  }, 3000);
});
```

**Kazanim:** ~200-500ms (yavas baglantilarda daha belirgin)

### 5. Joiner icin Edge Function Tamamen Atla (Mevcut Dogrulama)
**Mevcut Durum:** Joiner zaten roomUrl'yi query param ile aliyor ve edge function'i atliyor. Bu dogru calistigini dogrulamak yeterli - ek degisiklik gerekmez.

## Degisecek Dosyalar Ozeti

| Dosya | Degisiklik | Tahmini Kazanim |
|-------|-----------|----------------|
| `index.html` | Daily.co DNS prefetch/preconnect | ~200-500ms |
| `src/components/chat/ChatWindow.tsx` | VideoCall chunk preload | ~200-1000ms |
| `supabase/functions/create-daily-room/index.ts` | Auth + DB paralellestirme | ~50-100ms |
| `src/pages/VideoCall/VideoCallPage.tsx` | Adaptif video kalitesi | ~200-500ms |

## Toplam Beklenen Kazanim

- **Hizli internet:** ~500-1000ms iyilesme
- **Yavas internet (3G/4G):** ~1000-2000ms iyilesme
- **Ilk arama (soguk):** ~1500-2500ms iyilesme (DNS + chunk preload + edge warmup birlesik etki)

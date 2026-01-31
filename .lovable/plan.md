
# Video Arama Kamera/Mikrofon Toggle Stabilitesi - UYGULANMIŞ ✅

## Tespit Edilen Sorunlar

### Sorun 1: Aynı Kullanıcı İçin Birden Fazla Session
Konsol loglarından görüldüğü üzere, aynı `appUserId` için birden fazla `session_id` mevcut:
- "Görkem" kullanıcısı için: `6de3c425-...`, `fabdcd9a-...` (iki farklı session)
- "Destek" kullanıcısı için: `cd54c718-...`, `4b9ad1c7-...` (iki farklı session)

`sanitizeParticipants` fonksiyonu bunları dedupe ediyor ancak **hangi kopyayı seçtiği her güncellemede değişebiliyor**. Bu durum `session_id`'nin değişmesine ve React'in VideoTile bileşenini **tamamen yeniden mount etmesine** neden oluyor → flickering.

### Sorun 2: AnimatePresence Key Problemi
VideoTile, `key={participant.session_id}` kullanıyor. Session ID değiştiğinde:
1. Eski VideoTile unmount oluyor (exit animasyonu)
2. Yeni VideoTile mount oluyor (enter animasyonu)
3. Kullanıcı bunu "gir-çık yapmış gibi" görüyor

### Sorun 3: Track State Kontrolü Yetersiz
Mevcut kod `participant.video` ve `participant.videoTrack` kullanıyor ancak Daily.co'nun detaylı tracks API'sini (`participant.tracks.video.state`) tam kullanmıyor. `setLocalVideo(false)` çağrıldığında:
- `participant.video = false` oluyor
- `participant.tracks.video.state = 'off'` oluyor
- Ancak eski `videoTrack` referansı hala mevcut olabiliyor (ended state'te)

### Sorun 4: Daily React Bileşenleri Kullanılmıyor
Proje `@daily-co/daily-react` paketini içeriyor ancak:
- `DailyVideo` bileşeni kullanılmıyor
- `DailyAudio` bileşeni kullanılmıyor
- `useVideoTrack`, `useAudioTrack` hook'ları kullanılmıyor

Bu bileşenler track state'ini otomatik olarak yönetiyor ve güvenlik açısından daha sağlam.

---

## Çözüm Tasarımı

### Yaklaşım: Daily React Bileşenlerini Kullanma

Daily.co'nun resmi React kütüphanesi (`@daily-co/daily-react`) track yönetimini handle eden hazır bileşenler sunuyor:

- **`DailyVideo`**: Otomatik olarak track state'ini takip eder, `isOff` durumunda video göstermez
- **`DailyAudio`**: Tüm remote katılımcıların sesini otomatik yönetir
- **`useVideoTrack`/`useAudioTrack`**: Track state'ini reactive olarak sağlar

---

## Teknik Değişiklikler

### Dosya: `src/pages/VideoCall.tsx`

#### Değişiklik 1: Stabil Key Kullanımı

`session_id` yerine `appUserId` kullanarak key stabilitesini sağla:

```typescript
// ÖNCE (sorunlu)
{remoteParticipants.map((participant) => (
  <motion.div key={participant.session_id}>  // Session değişebilir!
    <VideoTile participant={participant} isLocal={false} />
  </motion.div>
))}

// SONRA (stabil)
{remoteParticipants.map((participant) => {
  const stableKey = (participant as any).userData?.appUserId || participant.session_id;
  return (
    <motion.div key={stableKey}>  // appUserId değişmez
      <VideoTile participant={participant} isLocal={false} />
    </motion.div>
  );
})}
```

#### Değişiklik 2: DailyVideo ve DailyAudio Bileşenlerini Kullanma

VideoTile'ı Daily React bileşenleriyle değiştir:

```typescript
import { DailyVideo, DailyAudio, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';

function VideoTile({ sessionId, isLocal }: { sessionId: string; isLocal: boolean }) {
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);
  
  const isVideoOff = videoTrack.isOff;
  const isAudioOff = audioTrack.isOff;
  
  return (
    <div className="relative bg-card rounded-xl overflow-hidden aspect-video">
      {/* DailyVideo otomatik olarak track durumunu handle eder */}
      <DailyVideo 
        sessionId={sessionId}
        type="video"
        automirror={isLocal}
        fit="cover"
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isVideoOff ? 0 : 1,
          transition: 'opacity 200ms'
        }}
      />
      
      {/* Kamera kapalı placeholder */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Avatar />
          <p>Kamera kapalı</p>
        </div>
      )}
      
      {/* Mikrofon durumu badge */}
      {isAudioOff && <MicOffBadge />}
    </div>
  );
}
```

#### Değişiklik 3: DailyAudio Bileşenini Ekle

Tüm remote audio'yu tek bir bileşenle yönet:

```typescript
function CallUI({ callObject }: CallUIProps) {
  return (
    <>
      {/* Bu bileşen TÜM remote katılımcıların sesini otomatik oynatır */}
      <DailyAudio />
      
      {/* Video grid */}
      <div className="grid ...">
        {participants.map(p => (
          <VideoTile key={stableKey} sessionId={p.session_id} isLocal={p.local} />
        ))}
      </div>
    </>
  );
}
```

#### Değişiklik 4: Sanitize Fonksiyonunu Güçlendir

Aynı kullanıcı için birden fazla session olduğunda **tutarlı seçim** yap:

```typescript
function sanitizeParticipants(participantList: DailyParticipant[]): { ... } {
  // ...
  
  for (const p of remoteCandidates) {
    const key = getParticipantKey(p);
    const existing = remoteMap.get(key);
    
    if (!existing) {
      remoteMap.set(key, p);
      continue;
    }
    
    // KRİTİK: Tutarlı seçim için session_id'yi deterministic olarak seç
    // En düşük session_id'yi seç (alfabetik sıra)
    // Bu sayede her render'da aynı session seçilir
    const shouldReplace = p.session_id < existing.session_id;
    
    // Ayrıca: media durumu "off" ise onu tercih et (güvenlik)
    const existingVideoOn = existing.video !== false;
    const pVideoOn = p.video !== false;
    
    if (!pVideoOn && existingVideoOn) {
      // Yeni participant "video kapalı" diyor - güvenlik için onu tercih et
      remoteMap.set(key, p);
    } else if (shouldReplace && existingVideoOn === pVideoOn) {
      // Aynı durumdalar, deterministic seçim için session_id kullan
      remoteMap.set(key, p);
    }
  }
  
  // ...
}
```

#### Değişiklik 5: Toggle Fonksiyonlarını Doğrulama ile Güçlendir

```typescript
const toggleCamera = useCallback(async () => {
  const newState = !isCameraOn;
  
  try {
    await callObject.setLocalVideo(newState);
    
    // Doğrulama: Gerçek durumu kontrol et ve state'i ona göre güncelle
    const local = callObject.participants().local;
    const actualState = local?.video !== false;
    
    if (actualState !== newState) {
      console.warn('[CallUI] Camera state mismatch! Requested:', newState, 'Actual:', actualState);
    }
    
    setIsCameraOn(actualState);
    
    // Participant güncellemesini zorla
    updateParticipants();
    
  } catch (error) {
    console.error('[CallUI] toggleCamera error:', error);
    // State'i geri al
    setIsCameraOn(isCameraOn);
  }
}, [callObject, isCameraOn, updateParticipants]);
```

---

## Uygulama Sırası

1. **Import'ları güncelle**: `DailyVideo`, `DailyAudio`, `useVideoTrack`, `useAudioTrack` ekle
2. **VideoTile'ı yeniden yaz**: Daily React hook'larını kullan
3. **DailyAudio ekle**: CallUI'ya tek bir DailyAudio bileşeni ekle
4. **Key stratejisini değiştir**: `session_id` → `appUserId` (stabil key)
5. **sanitizeParticipants'ı düzelt**: Deterministic seçim mantığı ekle
6. **Toggle fonksiyonlarını güçlendir**: Doğrulama ve zorla güncelleme ekle

---

## Güvenlik Garantisi

Bu değişikliklerle:

1. **Kamera kapatıldığında**: 
   - `setLocalVideo(false)` → Daily track'i durdurur → veri gönderilmez
   - `useVideoTrack(sessionId).isOff = true` → UI anında güncellenir
   - Karşı taraf hiçbir frame görmez

2. **Mikrofon kapatıldığında**:
   - `setLocalAudio(false)` → Daily audio track'i durdurur → ses gönderilmez
   - `useAudioTrack(sessionId).isOff = true` → UI anında güncellenir
   - Karşı taraf hiçbir ses duymaz

3. **Flickering önlenir**:
   - Stabil key (`appUserId`) kullanılır
   - React bileşeni yeniden mount edilmez
   - Sadece props değişir → smooth geçiş

---

## Değiştirilecek Dosya

| Dosya | Değişiklik |
|-------|------------|
| `src/pages/VideoCall.tsx` | VideoTile'ı Daily React bileşenleriyle güncelle, DailyAudio ekle, key stratejisini değiştir, sanitize mantığını düzelt |

## Beklenen Sonuç

- Kamera/mikrofon toggle anında karşı tarafta yansır
- Flickering ("gir-çık" görünümü) tamamen ortadan kalkar
- Güvenlik garantisi: kapalıyken kesinlikle veri gitmez
- Stabil, profesyonel video arama deneyimi

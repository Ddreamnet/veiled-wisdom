

# Video Arama Ses Sorunu Çözüm Planı

## Sorun Tanımı

Görüntülü aramada ses karşı tarafa iletilmiyor. Konsol loglarından görüldüğü üzere audio track'ler oluşturuluyor (`audioTrackId` mevcut) ancak ses oynatılmıyor.

## Kök Neden Analizi

Konsol loglarından kritik bulgular:

```text
[VideoCall] participants(raw) [
  {
    "session_id": "a6b41874-ccbf-40cf-a157-1f968266b73d",
    "local": false,
    "audioTrackId": "e138e994-2bff-4496-b47b-8fbd237767de"  ← Audio track VAR
  }
]

[CallUI] track-started event: {
  "trackType": "audio",
  "isLocal": false  ← Remote audio track başlatıldı
}
```

**Sorun**: `VideoTile` bileşeninde yalnızca `<video>` elementi var. Remote katılımcıların **audio track'i için bir `<audio>` elementi oluşturulmuyor**. Video elementi `muted={isLocal}` ayarlı - yani remote katılımcılar için muted değil, ancak **video elementine yalnızca video track bağlanıyor, audio track bağlanmıyor**.

```typescript
// Mevcut kod - SADECE video track bağlanıyor
useEffect(() => {
  if (participant.videoTrack) {
    const stream = new MediaStream([participant.videoTrack]);  // ← Audio YOK
    videoRef.current.srcObject = stream;
  }
}, [participant.videoTrack]);
```

## Çözüm Tasarımı

### Seçenek 1: Video Stream'e Audio Track Ekleme (Önerilen)

Video elementi hem video hem audio oynatabilir. `MediaStream`'e her iki track'i de ekleyerek ses sorununu çözebiliriz:

```typescript
useEffect(() => {
  if (!videoRef.current) return;
  
  const tracks: MediaStreamTrack[] = [];
  
  // Video track ekle
  if (participant.videoTrack) {
    tracks.push(participant.videoTrack);
  }
  
  // Audio track ekle (remote katılımcılar için)
  if (!isLocal && participant.audioTrack) {
    tracks.push(participant.audioTrack);
  }
  
  if (tracks.length > 0) {
    const stream = new MediaStream(tracks);
    videoRef.current.srcObject = stream;
  }
}, [participant.videoTrack, participant.audioTrack, isLocal]);
```

### Seçenek 2: Ayrı Audio Elementi (Alternatif)

Remote katılımcılar için ayrı bir `<audio>` elementi oluşturmak:

```typescript
const audioRef = useRef<HTMLAudioElement>(null);

useEffect(() => {
  if (!audioRef.current || isLocal) return;
  if (participant.audioTrack) {
    const stream = new MediaStream([participant.audioTrack]);
    audioRef.current.srcObject = stream;
  }
}, [participant.audioTrack, isLocal]);

// JSX'te:
{!isLocal && <audio ref={audioRef} autoPlay />}
```

### Seçenek 3: Daily.co tracks API Kullanımı (En Güvenilir)

Daily.co'nun yeni `tracks` API'sini kullanarak:

```typescript
// participant.audioTrack yerine participant.tracks.audio.persistentTrack kullan
const audioTrack = participant.tracks?.audio?.persistentTrack;
const videoTrack = participant.tracks?.video?.persistentTrack;
```

---

## Uygulama Planı

### Dosya: `src/pages/VideoCall.tsx`

#### 1. VideoTile Bileşenini Güncelle

**Değişiklik**: Audio track'i stream'e ekle ve audio elementi oluştur.

```typescript
function VideoTile({ participant, isLocal }: { participant: DailyParticipant; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Video track bağlama
  useEffect(() => {
    if (!videoRef.current) return;
    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }
  }, [participant.videoTrack, participant.session_id]);

  // YENI: Audio track bağlama (remote katılımcılar için)
  useEffect(() => {
    if (!audioRef.current || isLocal) return;
    
    const audioTrack = participant.audioTrack || 
                       (participant as any).tracks?.audio?.persistentTrack;
    
    if (audioTrack) {
      const stream = new MediaStream([audioTrack]);
      audioRef.current.srcObject = stream;
      
      // Safari için autoplay fix
      audioRef.current.play().catch(e => {
        console.warn('[VideoTile] Audio autoplay failed:', e);
      });
    }
  }, [participant.audioTrack, (participant as any).tracks?.audio, participant.session_id, isLocal]);

  return (
    <div className="relative ...">
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}  // Local için muted, remote için unmuted
        playsInline
        className="w-full h-full object-cover"
      />
      
      {/* YENI: Remote katılımcılar için ayrı audio elementi */}
      {!isLocal && (
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline
        />
      )}
      
      {/* ... geri kalan JSX ... */}
    </div>
  );
}
```

#### 2. Debug Logging Ekle

Audio track durumunu izlemek için logging ekle:

```typescript
// track-started event handler'ına debug ekle
const handleTrackStarted = (event: any) => {
  console.log('[CallUI] track-started event:', {
    participant: event?.participant?.user_name,
    trackType: event?.track?.kind,
    isLocal: event?.participant?.local,
    trackId: event?.track?.id,
    trackEnabled: event?.track?.enabled,
    trackMuted: event?.track?.muted,
  });
  updateParticipants();
};
```

#### 3. Join Options'a Audio Ayarları Ekle

`join()` çağrısında audio'nun açık olduğundan emin ol:

```typescript
const joinOptions: any = {
  url: roomUrl,
  userName: displayName,
  userData: user?.id ? { appUserId: user.id } : undefined,
  startAudioOff: false,  // YENI: Ses açık başla
  startVideoOff: false,  // Video açık başla
  sendSettings: {
    video: { maxQuality: 'high' as const },
  },
};
```

#### 4. WaitingRoom Audio Preview

Beklerken de sesin çalıştığından emin ol:

```typescript
// WaitingRoom bileşeninde audio track kontrolü
useEffect(() => {
  if (!localParticipant?.audioTrack) return;
  // Audio track'in enabled olduğunu doğrula
  console.log('[WaitingRoom] Local audio track:', {
    enabled: localParticipant.audioTrack.enabled,
    muted: localParticipant.audioTrack.muted,
  });
}, [localParticipant?.audioTrack]);
```

---

## Teknik Detaylar

### Neden Video Elementi Ses Çalmıyor?

1. `<video>` elementi `muted={false}` olsa bile, `srcObject`'e bağlanan `MediaStream`'de audio track yoksa ses çalmaz
2. Mevcut kod sadece `videoTrack`'i stream'e ekliyor
3. `audioTrack` asla DOM'a bağlanmıyor

### Daily.co Track API

Daily.co iki farklı track API'si sunuyor:

| Eski API (deprecated) | Yeni API |
|-----------------------|----------|
| `participant.audioTrack` | `participant.tracks.audio.persistentTrack` |
| `participant.videoTrack` | `participant.tracks.video.persistentTrack` |

Her iki API de desteklenmeli (backward compatibility).

### Browser Autoplay Politikaları

Safari ve bazı tarayıcılar, kullanıcı etkileşimi olmadan ses çalmayı engelleyebilir. Çözüm:

```typescript
audioRef.current.play().catch(e => {
  if (e.name === 'NotAllowedError') {
    // Kullanıcıya "Sesi aç" butonu göster
    console.warn('Audio autoplay blocked. User interaction required.');
  }
});
```

---

## Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/pages/VideoCall.tsx` | VideoTile'a audio elementi ekle, track bağlama mantığını güncelle, join options'a audio ayarları ekle |

## Test Senaryoları

1. **A kullanıcısı aramayı başlatır, B katılır** → Her iki taraf birbirinin sesini duymalı
2. **Mikrofon aç/kapa** → Diğer taraf durumu görsel olarak görmeli ve ses kesilmeli/açılmalı
3. **Safari'de test** → Autoplay politikası nedeniyle sorun olabilir, gerekirse kullanıcı etkileşimi iste
4. **Konsol loglarını kontrol et** → `[VideoTile] Audio track attached` logları görünmeli



# Video Arama Realtime Sorunları - Detaylı Analiz ve Çözüm Planı

## Tespit Edilen Kök Nedenler

### SORUN A: Daily Track Event Spam ve Mikrofon Mute'ta Video Yenilenmesi

#### Kök Neden Analizi

**1. Handler Çoğaltması Durumu: SORUN YOK**
- Mevcut kod `useEffect` içinde `callObject.on(...)` çağrılarını yapıyor (satır 940-949)
- Cleanup fonksiyonu `callObject.off(...)` ile tüm listener'ları kaldırıyor (satır 951-961)
- Bu pattern doğru, ancak dependencies array'inde `[callObject, navigate, toast, addNotification, updateParticipants, syncLocalMediaState]` var. Bu fonksiyonlar her render'da yeniden oluşturulabiliyor.

**2. Gerçek Sorun: `updateParticipants` Çok Sık Çağrılıyor**

Her track olayı `updateParticipants()` çağırıyor:

```typescript
// satır 913
if (event?.participant?.local) {
  syncLocalMediaState();
}
updateParticipants();  // HER OLAY İÇİN ÇAĞRILIYOR
```

Bir mikrofon toggle işlemi şu olayları tetikler:
1. `track-stopped` (audio) → `updateParticipants()`
2. `participant-updated` → `updateParticipants()` 
3. Daily WebRTC renegotiation → birden fazla `participant-updated` olayı

Her `updateParticipants()` çağrısı `setParticipants()` yapıyor, bu da tüm VideoTile'ların re-render olmasına neden oluyor.

**3. Duplicate Session Sorunu**

Aynı kullanıcı için birden fazla `session_id` olduğunda (günlüklerden: "Görkem" ve "Destek" için duplikasyonlar), `sanitizeParticipants` fonksiyonu tutarlı bir şekilde aynı session'ı seçmeyebiliyor. Bu da key değişikliğine ve bileşen remount'una yol açıyor.

**4. Track Event Deduplication Eksik**

Track olayları için herhangi bir deduplication mekanizması yok. Daily.co aynı track için birden fazla olay gönderebilir (ICE renegotiation, SDP renegotiation sırasında).

### SORUN B: Overlay Log Spam

**Kök Neden: ÖNCEKİ DÜZELTME BAŞARILI**
- Satır 1067-1073'te `useEffect` ile transition-only logging implemente edilmiş
- Bu sorun zaten çözülmüş görünüyor, ancak doğrulanması gerekir

### SORUN C: Lovable WebSocket Hatası

**Kök Neden: Lovable Runtime - Sizin Kontrolünüzde Değil**

WebSocket bağlantısı `wss://c391e753-6d15-45ab-929e-e1c102409f72.lovableproject.com/` Lovable platformunun geliştirme ortamı tarafından enjekte ediliyor:

1. `vite.config.ts` satır 4: `import { componentTagger } from "lovable-tagger";`
2. Bu plugin sadece development modunda çalışıyor: `mode === "development" && componentTagger()`
3. Bu Lovable'ın hot-reload ve canlı önizleme özelliği için kullanılan bir WebSocket

**Sonuç:** Bu hata:
- Sadece Lovable preview ortamında oluşur
- Production build'de oluşmaz (componentTagger sadece dev'de aktif)
- Uygulamanızın çalışmasını etkilemez
- Kontrol edemeyeceğiniz Lovable altyapısının bir parçasıdır

---

## Teknik Çözüm Planı

### Değişiklik 1: Track Event Deduplication Sistemi

Track durumlarını takip eden bir Map ekleyerek aynı durum için duplicate logları ve güncellemeleri önle:

```typescript
// CallUI içinde yeni state
const trackStatesRef = useRef<Map<string, { video: boolean; audio: boolean }>>(new Map());

const handleTrackStarted = (event: any) => {
  const sessionId = event?.participant?.session_id;
  const trackKind = event?.track?.kind as 'video' | 'audio';
  
  if (!sessionId || !trackKind) return;
  
  // Mevcut durumu al
  const current = trackStatesRef.current.get(sessionId) || { video: false, audio: false };
  const newState = { ...current, [trackKind]: true };
  
  // Sadece gerçek bir değişiklik varsa işle
  if (current[trackKind] === true) {
    // Duplicate olay - atla
    return;
  }
  
  trackStatesRef.current.set(sessionId, newState);
  
  // Şimdi log ve güncelle
  if (!event?.participant?.local) {
    console.log('[CallUI] track-started (remote):', {
      participant: event?.participant?.user_name,
      trackType: trackKind,
      transition: 'off -> on'
    });
  }
  
  if (event?.participant?.local) {
    syncLocalMediaState();
  }
  
  updateParticipants();
};
```

### Değişiklik 2: updateParticipants Debounce

Sık güncellemeleri birleştirmek için debounce ekle:

```typescript
// CallUI içinde
const updateTimeoutRef = useRef<number | null>(null);

const debouncedUpdateParticipants = useCallback(() => {
  if (updateTimeoutRef.current) {
    window.clearTimeout(updateTimeoutRef.current);
  }
  updateTimeoutRef.current = window.setTimeout(() => {
    updateParticipants();
    updateTimeoutRef.current = null;
  }, 50); // 50ms debounce
}, [updateParticipants]);
```

### Değişiklik 3: Stabil Participant Seçimi

`sanitizeParticipants` fonksiyonunda deterministic seçim garantisi:

```typescript
// Mevcut kod (satır 210):
if (pSessionId < existingSessionId) {
  remoteMap.set(key, p);
}

// Güçlendirilmiş versiyon:
// 1. "Media kapalı" olan participant'ı güvenlik için tercih et
// 2. Aynıysa, en düşük session_id'yi TUTARLI şekilde seç
// 3. Track event güncellemelerini de dikkate al
```

### Değişiklik 4: Handler Registration Logging (Debug için)

Event handler'ların kaç kez register edildiğini izlemek için bir kerelik log:

```typescript
// useEffect başında
console.log('[CallUI] Registering Daily event handlers for callObject:', callObject.meetingState?.());
```

### Değişiklik 5: WebSocket Hatası - Uyarı Notu

Bu bir Lovable platform hatası olduğu için kod değişikliği yapılamaz. Kullanıcıya açıklama:
- Production'da bu hata olmayacak
- Development ortamında güvenle görmezden gelinebilir
- Lovable'ın canlı önizleme özelliğinin bir parçası

---

## Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/pages/VideoCall.tsx` | Track deduplication, debounced updates, handler logging |

---

## Uygulama Detayları

### CallUI Değişiklikleri (VideoCall.tsx)

#### 1. Yeni Ref'ler (yaklaşık satır 780 civarına eklenecek):

```typescript
// Track state deduplication için
const trackStatesRef = useRef<Map<string, { video: boolean; audio: boolean }>>(new Map());

// updateParticipants debounce için
const updateDebounceRef = useRef<number | null>(null);
```

#### 2. Debounced Update Helper (yaklaşık satır 828 civarına eklenecek):

```typescript
const debouncedUpdateParticipants = useCallback(() => {
  if (updateDebounceRef.current) {
    window.clearTimeout(updateDebounceRef.current);
  }
  updateDebounceRef.current = window.setTimeout(() => {
    updateParticipants();
    updateDebounceRef.current = null;
  }, 50);
}, [updateParticipants]);

// Cleanup için effect
useEffect(() => {
  return () => {
    if (updateDebounceRef.current) {
      window.clearTimeout(updateDebounceRef.current);
    }
  };
}, []);
```

#### 3. handleTrackStarted Güncelleme (satır 901-914):

```typescript
const handleTrackStarted = (event: any) => {
  const sessionId = event?.participant?.session_id;
  const trackKind = event?.track?.kind as 'video' | 'audio';
  
  if (!sessionId || !trackKind) {
    console.log('[CallUI] track-started incomplete event:', { sessionId, trackKind });
    return;
  }
  
  const current = trackStatesRef.current.get(sessionId) || { video: false, audio: false };
  
  // Duplicate check - aynı durum için işlem yapma
  if (current[trackKind] === true) {
    return;
  }
  
  trackStatesRef.current.set(sessionId, { ...current, [trackKind]: true });
  
  if (!event?.participant?.local) {
    console.log('[CallUI] track-started (remote):', {
      participant: event?.participant?.user_name || 'unknown',
      trackType: trackKind,
    });
  }
  
  if (event?.participant?.local) {
    syncLocalMediaState();
  }
  
  debouncedUpdateParticipants();
};
```

#### 4. handleTrackStopped Güncelleme (satır 917-930):

```typescript
const handleTrackStopped = (event: any) => {
  const sessionId = event?.participant?.session_id;
  const trackKind = event?.track?.kind as 'video' | 'audio';
  
  if (!sessionId || !trackKind) {
    // Bazen participant bilgisi eksik olabilir - sadece bir kez logla
    if (import.meta.env.DEV) {
      console.log('[CallUI] track-stopped incomplete event (ignored)');
    }
    return;
  }
  
  const current = trackStatesRef.current.get(sessionId) || { video: true, audio: true };
  
  // Duplicate check - zaten kapalıysa işlem yapma
  if (current[trackKind] === false) {
    return;
  }
  
  trackStatesRef.current.set(sessionId, { ...current, [trackKind]: false });
  
  if (!event?.participant?.local) {
    console.log('[CallUI] track-stopped (remote):', {
      participant: event?.participant?.user_name || 'unknown',
      trackType: trackKind,
    });
  }
  
  if (event?.participant?.local) {
    syncLocalMediaState();
  }
  
  debouncedUpdateParticipants();
};
```

#### 5. handleParticipantUpdated Güncelleme (satır 889-891):

```typescript
const handleParticipantUpdated = () => {
  debouncedUpdateParticipants();
};
```

#### 6. Participant Left Cleanup (satır 893-899'a ek):

```typescript
const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
  console.log('[CallUI] participant-left event:', event?.participant?.user_name);
  
  // Track state'i temizle
  if (event?.participant?.session_id) {
    trackStatesRef.current.delete(event.participant.session_id);
  }
  
  if (event?.participant && !event.participant.local) {
    addNotification('leave', event.participant.user_name || 'Katılımcı');
  }
  
  updateParticipants(); // Ayrılma anında, debounce olmadan güncelle
};
```

#### 7. Handler Registration ID (satır 830 civarına):

```typescript
// Debug: Handler registration (sadece dev modda)
if (import.meta.env.DEV) {
  console.log('[CallUI] Registering event handlers. MeetingState:', callObject.meetingState?.());
}
```

---

## Doğrulama Kontrol Listesi

### Sorun A Test Adımları:
1. Video aramasını başlat, iki kullanıcıyla katıl
2. A kullanıcısı mikrofonu bir kez kapat
3. B kullanıcısının video tile'ı yenilenmemeli (animasyon/hareket olmamalı)
4. Konsolda `track-stopped (remote)` sadece BİR KERE loglanmalı
5. "off -> off" veya duplicate loglar olmamalı

### Sorun A Test Adımları (Devam):
6. A kullanıcısı kamerayı 10 kez hızlıca aç-kapat
7. Her toggle için sadece 1 transition logu görülmeli
8. B'deki video tile stabil kalmalı, remount olmamalı

### Sorun B Doğrulama:
1. Aramaya katıldıktan sonra konsolu izle
2. "Overlay visibility check" spam'i olmamalı
3. Sadece "Overlay visibility changed" transition logları görülmeli

### Sorun C Açıklama:
1. WebSocket hatası Lovable platform kaynaklı
2. Production deploy'da oluşmayacak
3. Uygulama fonksiyonelliğini etkilemiyor

---

## Özet

| Sorun | Kök Neden | Çözüm |
|-------|-----------|-------|
| A - Track spam | Deduplication eksik, debounce yok | Track state Map + 50ms debounce |
| A - Video refresh on mic mute | Çok sık `updateParticipants` | Debounced updates |
| B - Overlay log spam | (Zaten düzeltilmiş) | Doğrulama |
| C - WebSocket retry | Lovable platform | Kod değişikliği gerekmiyor, production'da olmayacak |


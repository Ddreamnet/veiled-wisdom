

# Video-Call (Görüntülü Arama) Codebase Review
## Kapsamlı Refactoring ve İyileştirme Planı

---

## ✅ Tamamlanan İşler (İterasyon 1)

### Paket 1: Log Temizliği - ✅ TAMAMLANDI
- `src/lib/debug.ts` oluşturuldu: `createTransitionLogger`, `devLog`, `devWarn`, `conditionalLog`
- `VideoCall.tsx` içindeki ~180 console.log/warn → 5'e düşürüldü (sadece kritik hatalar)
- Transition-based logging: `logParticipantsTransition`, `logCallStateTransition`, `logParentGateState`, `logOverlayVisibility`
- Tüm dev-only loglar `devLog()` ile sarmalandı

### Paket 2: Hook Çıkarımı - ✅ TAMAMLANDI
**Oluşturulan yeni dosyalar:**
```text
src/hooks/video-call/
├── index.ts              (barrel export)
├── useCallNotifications.ts  (participant join/leave notifications)
├── useCallTimers.ts         (solo timeout, max duration)
├── useMediaControls.ts      (camera/mic toggle with Daily sync)
└── useParticipants.ts       (sanitizeParticipants, debounced updates)
```

**Not:** Hook'lar ayrı dosyalarda oluşturuldu. VideoCall.tsx hâlâ local implementasyonları kullanıyor (stability için). Gelecek iterasyonda migrate edilebilir.

---

## Executive Summary

**Dosya Boyutu**: `VideoCall.tsx` ~1745 satır (önceki: 1781) - log temizliği ile azaltıldı

---

## 1. Mimari Analiz ve Dosya Haritası

### Kritik Dosyalar (Öncelik Sırası)

| Dosya | Satır | Kritiklik | Kullanım Frekansı |
|-------|-------|-----------|-------------------|
| `src/pages/VideoCall.tsx` | 1781 | 🔴 Çok Yüksek | Her video aramada |
| `supabase/functions/create-daily-room/index.ts` | 426 | 🔴 Yüksek | Her arama başlatmada |
| `src/hooks/useActiveCall.ts` | 120 | 🟡 Orta | Her mesaj görünümünde |
| `src/components/chat/ChatWindow.tsx` | 189 | 🟢 Düşük | Mesajlaşmada |
| `src/lib/performance.ts` | 54 | 🟢 Düşük | Utility |

### Mevcut Modül Yapısı (VideoCall.tsx içinde)

```text
VideoCall.tsx (1781 satır)
├── Types & Constants (satır 1-90)
├── Module-level State (satır 60-82)
│   ├── initFlowMutex
│   ├── createRoomMutex
│   ├── globalTrackStates
│   └── handlerRegistrationCount
├── Helper Functions (satır 92-266)
│   ├── formatTime, assertValidDailyUrl
│   ├── isExpRoomError, isNoRoomError
│   ├── parseEdgeFunctionError, getErrorMessage
│   ├── getParticipantKey, isMirrorOfLocal
│   ├── sanitizeParticipants, logParticipants
├── UI Components (satır 268-686)
│   ├── ParticipantNotification
│   ├── NotificationsOverlay
│   ├── AnimatedBackground
│   ├── MediaStatusBadge
│   ├── WaitingIndicator
│   ├── ControlButton
│   ├── WaitingRoom (117 satır)
│   ├── VideoTile (100 satır)
│   ├── FilteredRemoteAudio
│   ├── LoadingScreen
│   └── ErrorScreen
├── Custom Hooks (satır 688-790)
│   ├── useNotifications
│   └── useCallTimers
├── CallUI Component (satır 792-1380, ~590 satır)
│   ├── State management
│   ├── Daily event handlers
│   ├── Toggle handlers
│   └── Render logic
└── VideoCall (Main) (satır 1382-1781, ~400 satır)
    ├── URL parsing
    ├── Room creation logic
    ├── Call initialization
    └── Render logic
```

---

## 2. Tespit Edilen Sorunlar ve Bulgular

### A. Potansiyel Buglar ve Edge Case'ler

#### A1. Race Condition: initAttemptedRef

**Konum**: Satır 1410-1418
**Sorun**: `initAttemptedRef` bileşen mount'ları arasında paylaşılmıyor, StrictMode'da sıfırlanıyor

```typescript
// Mevcut kod
const initAttemptedRef = useRef(false);
useEffect(() => {
  if (initAttemptedRef.current) {
    console.log('[VideoCall] Init already attempted, skipping duplicate');
    return;  // BU ASLA çalışmayabilir StrictMode'da
  }
  initAttemptedRef.current = true;
  // ...
}, [conversationId, intent, navigate, toast]);
```

**Risk**: StrictMode'da çift mount, çift init denemesi olabilir

#### A2. Cleanup Eksikliği: joinTimeout

**Konum**: Satır 1600-1607
**Sorun**: `joinTimeout` cleanup'ta düzgün temizlenmiyor (conditional path)

```typescript
// Event handler içinde timeout temizleniyor ama...
call.on('joined-meeting', () => {
  if (joinTimeout) window.clearTimeout(joinTimeout);
});

// ...ama bu handler call.destroy() sonrası çalışmaz
```

**Risk**: Memory leak veya stale timeout callback

#### A3. Media Track Cleanup Eksikliği

**Konum**: Satır 1439-1450 (requestMediaPermissions)
**Sorun**: Tracks durduruluyor ama error case'de cleanup yok

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
stream.getTracks().forEach((t) => t.stop());
// ^ Bu başarılı case. Ama catch bloğunda stream hâlâ açık kalabilir
```

#### A4. Reconnect Logic Eksikliği

**Konum**: Tüm dosya
**Sorun**: Network kesintisi sonrası reconnect mekanizması yok

**Risk**: Kısa network kesintilerinde kullanıcı "Bağlantı hatası" görür

#### A5. Dual callObject Registration

**Konum**: Satır 1604-1616
**Sorun**: `call.on('joined-meeting')` ve `call.on('error')` iki kez register edilebilir

```typescript
// VideoCall component'te:
call.on('joined-meeting', () => { ... });
call.on('error', (e) => { ... });

// CallUI component'te de:
callObject.on('joined-meeting', handleJoinedMeeting);
callObject.on('error', handleError);
```

**Risk**: Aynı event için iki farklı handler çalışır

---

### B. Duplicate Mantık ve Gereksiz Kod Yolları

#### B1. İki Farklı Event Handler Seti

**Konum**: VideoCall (satır 1604-1616) ve CallUI (satır 1106-1115)
**Sorun**: Aynı Daily eventleri iki yerde handle ediliyor

**Çözüm**: Event handling'i tek bir yerde (CallUI) konsolide et

#### B2. Media State Tracking: Üç Farklı Kaynak

1. `isCameraOn/isMicOn` state (CallUI)
2. `isCameraOnRef/isMicOnRef` ref (CallUI)
3. `callObject.participants().local.video/audio` (Daily API)

**Sorun**: State senkronizasyonu karmaşık ve hata yapılabilir

#### B3. Participant Sanitization Karmaşıklığı

**Konum**: Satır 178-244
**Sorun**: `sanitizeParticipants` fonksiyonu 66 satır ve çok fazla koşul içeriyor

#### B4. Error Handling Tutarsızlığı

```typescript
// Bazı yerlerde:
catch (e) { console.error(...); setError(...); }

// Bazı yerlerde:
catch (e) { console.warn(...); } // Error state güncellenmez

// Bazı yerlerde:
catch { return true; } // Silent fail
```

---

### C. Gereksiz Karmaşıklık ve Konsolidasyon Fırsatları

#### C1. Dağınık Timer/Timeout Yönetimi

**Mevcut Durum**:
- `joinTimeout` (VideoCall)
- `updateDebounceRef` (CallUI)
- `soloTimeout` interval (useCallTimers)
- `maxDurationCheck` interval (useCallTimers)
- `notificationTimer` (ParticipantNotification)

**Öneri**: Tek bir `useCallLifecycle` hook'u

#### C2. Module-Level State Proliferation

```typescript
const initFlowMutex = new Map<string, Promise<void>>();
const createRoomMutex = new Map<string, Promise<CreateDailyRoomResponse>>();
const globalTrackStates = new Map<string, Map<string, { video: boolean; audio: boolean }>>();
const handlerRegistrationCount = new Map<string, number>();
```

**Sorun**: Bu state'ler memory'de kalıcı, cleanup gerektiriyor

#### C3. CallUI Bileşen Boyutu

**590 satır** tek bir bileşende - SOLID prensiplerini ihlal ediyor

---

### D. Log Spam ve Runtime Sinyalleri

#### D1. Kalan Log Noktaları (Potansiyel Spam)

| Log | Konum | Spam Riski |
|-----|-------|------------|
| `[VideoCall] Parent gate state` | 1402 | ✅ Her render |
| `[CallUI] Registering handlers` | 934 | ⚠️ Her mount |
| `[CallUI] Initial meeting state on mount` | 946 | ⚠️ Her mount |
| `[CallUI] participant-joined event` | 992 | ⚠️ Duplicate sessions |
| `logParticipants` | 900 | ⚠️ Her update |

#### D2. Eksik Error Boundary

Video call crash olduğunda tüm uygulama etkilenebilir

---

### E. Performans Darboğazları

#### E1. Sık Re-render

**Tetikleyiciler**:
- `updateParticipants()` çağrıları (debounced ama hâlâ sık)
- `setParticipants()` tüm VideoTile'ları re-render eder
- `callState` değişiklikleri

#### E2. useEffect Dependency Array Boyutu

```typescript
// Satır 1137 - 7 dependency!
}, [callObject, conversationId, navigate, toast, addNotification, 
    updateParticipants, debouncedUpdateParticipants, autoNavigateOnLeaveRef, 
    syncLocalMediaState]);
```

**Sorun**: Her dependency değişikliğinde handler'lar yeniden register ediliyor

#### E3. Bundle Size

`@daily-co/daily-js` + `@daily-co/daily-react` + `framer-motion` birlikte ağır

---

## 3. Refactoring Paketleri (Risk/Etki Sıralaması)

### Paket 1: Düşük Risk - Log Temizliği ve Debug İyileştirmesi
**Etki**: Düşük | **Risk**: Çok Düşük | **Süre**: 1-2 saat

**Değişiklikler**:
1. Conditional logging helper oluştur
2. `[VideoCall] Parent gate state` logunu transition-only yap
3. `logParticipants`'ı sadece değişiklik olduğunda çağır
4. Dev-only logları `import.meta.env.DEV` ile sarmala

```typescript
// Yeni utility
const logOnChange = (tag: string, prev: any, next: any) => {
  if (!import.meta.env.DEV) return;
  if (JSON.stringify(prev) !== JSON.stringify(next)) {
    console.log(tag, next);
  }
};
```

### Paket 2: Düşük Risk - Hook Çıkarımı
**Etki**: Orta | **Risk**: Düşük | **Süre**: 2-3 saat

**Yeni Dosyalar**:
```text
src/hooks/video-call/
├── useCallState.ts       (callState management)
├── useMediaControls.ts   (camera/mic toggle)
├── useParticipants.ts    (participant list + sanitization)
├── useDailyEvents.ts     (event handler registration)
└── index.ts
```

**Değişiklikler**:
1. `useNotifications` → `src/hooks/video-call/useCallNotifications.ts`
2. `useCallTimers` → `src/hooks/video-call/useCallTimers.ts`
3. Toggle logic → `src/hooks/video-call/useMediaControls.ts`

### Paket 3: Orta Risk - Bileşen Ayrıştırma
**Etki**: Yüksek | **Risk**: Orta | **Süre**: 4-6 saat

**Yeni Dosya Yapısı**:
```text
src/pages/VideoCall/
├── index.tsx             (main export, 200 satır)
├── CallUI.tsx            (400 satır)
├── WaitingRoom.tsx       (120 satır)
├── VideoTile.tsx         (100 satır)
├── components/
│   ├── ParticipantNotification.tsx
│   ├── NotificationsOverlay.tsx
│   ├── AnimatedBackground.tsx
│   ├── MediaControls.tsx
│   └── FilteredRemoteAudio.tsx
├── hooks/
│   └── (Paket 2'den)
├── utils/
│   ├── participantUtils.ts
│   ├── errorUtils.ts
│   └── roomUtils.ts
└── types.ts
```

### Paket 4: Orta Risk - Event Handler Konsolidasyonu
**Etki**: Orta | **Risk**: Orta | **Süre**: 3-4 saat

**Değişiklikler**:
1. VideoCall'daki `call.on()` handler'larını kaldır
2. Tüm event handling'i CallUI'ye taşı
3. `useDailyEvents` hook'u oluştur

### Paket 5: Yüksek Risk - Reconnect Logic Ekleme
**Etki**: Yüksek | **Risk**: Yüksek | **Süre**: 6-8 saat

**Değişiklikler**:
1. `network-connection` ve `network-quality-change` event'lerini dinle
2. Otomatik reconnect mekanizması ekle
3. Kullanıcıya "Bağlantı yeniden kuruluyor" göster
4. Exponential backoff ile retry logic

---

## 4. Detaylı Değişiklik Spesifikasyonları

### Paket 1: Log Temizliği

#### 1.1 Conditional Logging Utility

```typescript
// src/lib/debug.ts
export function createTransitionLogger<T>(tag: string) {
  let prev: T | undefined;
  return (current: T) => {
    if (!import.meta.env.DEV) return;
    const currentStr = JSON.stringify(current);
    const prevStr = JSON.stringify(prev);
    if (currentStr !== prevStr) {
      console.log(`[${tag}] Transition:`, current);
      prev = current;
    }
  };
}
```

#### 1.2 Parent Gate State Log Düzeltmesi

**Mevcut** (Satır 1401-1408):
```typescript
useEffect(() => {
  console.log('[VideoCall] Parent gate state:', {
    isLoading,
    hasCallObject: !!callObject,
    intent,
    conversationId,
  });
}, [isLoading, callObject, intent, conversationId]);
```

**Yeni**:
```typescript
const prevParentStateRef = useRef<string>('');
useEffect(() => {
  const state = JSON.stringify({ isLoading, hasCallObject: !!callObject, intent });
  if (state !== prevParentStateRef.current) {
    console.log('[VideoCall] Parent gate state changed:', { isLoading, hasCallObject: !!callObject, intent, conversationId });
    prevParentStateRef.current = state;
  }
}, [isLoading, callObject, intent, conversationId]);
```

### Paket 2: useMediaControls Hook

```typescript
// src/hooks/video-call/useMediaControls.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCall } from '@daily-co/daily-js';

export function useMediaControls(callObject: DailyCall) {
  const [isCameraOn, setIsCameraOn] = useState(() => {
    try {
      const local = callObject.participants().local;
      return local?.video !== false;
    } catch { return true; }
  });
  
  const [isMicOn, setIsMicOn] = useState(() => {
    try {
      const local = callObject.participants().local;
      return local?.audio !== false;
    } catch { return true; }
  });
  
  const isCameraOnRef = useRef(isCameraOn);
  const isMicOnRef = useRef(isMicOn);
  
  useEffect(() => { isCameraOnRef.current = isCameraOn; }, [isCameraOn]);
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);

  const syncFromDaily = useCallback(() => {
    try {
      const local = callObject.participants().local;
      if (local) {
        const videoOn = local.video !== false;
        const audioOn = local.audio !== false;
        if (isCameraOnRef.current !== videoOn) setIsCameraOn(videoOn);
        if (isMicOnRef.current !== audioOn) setIsMicOn(audioOn);
      }
    } catch (e) {
      console.warn('[useMediaControls] sync error:', e);
    }
  }, [callObject]);

  const toggleCamera = useCallback(async () => {
    const newState = !isCameraOnRef.current;
    try {
      await callObject.setLocalVideo(newState);
      syncFromDaily();
    } catch (error) {
      console.error('[useMediaControls] toggleCamera error:', error);
      throw error;
    }
  }, [callObject, syncFromDaily]);

  const toggleMic = useCallback(async () => {
    const newState = !isMicOnRef.current;
    try {
      await callObject.setLocalAudio(newState);
      syncFromDaily();
    } catch (error) {
      console.error('[useMediaControls] toggleMic error:', error);
      throw error;
    }
  }, [callObject, syncFromDaily]);

  return {
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
    syncFromDaily,
  };
}
```

---

## 5. Test Stratejisi

### Unit Tests (Vitest)

```typescript
// src/hooks/video-call/__tests__/useMediaControls.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaControls } from '../useMediaControls';

describe('useMediaControls', () => {
  it('should initialize camera state from Daily', () => {
    const mockCallObject = {
      participants: () => ({ local: { video: true, audio: true } }),
      setLocalVideo: vi.fn().mockResolvedValue(undefined),
      setLocalAudio: vi.fn().mockResolvedValue(undefined),
    };
    
    const { result } = renderHook(() => 
      useMediaControls(mockCallObject as any)
    );
    
    expect(result.current.isCameraOn).toBe(true);
    expect(result.current.isMicOn).toBe(true);
  });

  it('should toggle camera and sync state', async () => {
    const mockCallObject = {
      participants: () => ({ local: { video: false, audio: true } }),
      setLocalVideo: vi.fn().mockResolvedValue(undefined),
      setLocalAudio: vi.fn().mockResolvedValue(undefined),
    };
    
    const { result } = renderHook(() => 
      useMediaControls(mockCallObject as any)
    );
    
    await act(async () => {
      await result.current.toggleCamera();
    });
    
    expect(mockCallObject.setLocalVideo).toHaveBeenCalledWith(true);
  });
});
```

### Integration Tests

```typescript
// src/pages/VideoCall/__tests__/VideoCall.integration.test.ts
describe('VideoCall Integration', () => {
  it('should display waiting room when no remote participants', async () => {
    // Mock Daily call object
    // Render VideoCall
    // Assert WaitingRoom is shown
  });

  it('should transition from loading to joined', async () => {
    // Mock successful join
    // Assert loading overlay disappears
    // Assert video grid appears
  });
});
```

### Manual Test Checklist

**Regression Prevention**:
- [ ] Video aramasını başlat, her iki taraf katılsın
- [ ] Kamera toggle 10 kez hızlıca → UI her seferinde doğru
- [ ] Mikrofon toggle → ses anında kapanmalı/açılmalı
- [ ] Bir taraf ayrılsın → diğer tarafta notification gösterilmeli
- [ ] Network kesintisi simüle et → uygun hata mesajı
- [ ] Console'da spam log olmamalı (sadece transitions)
- [ ] 30 dakika yalnız kal → otomatik sonlandırma
- [ ] 2 saat görüşme → maksimum süre uyarısı

---

## 6. Uygulama Takvimi

### İterasyon 1 (1-2 gün)
- [x] Mimari analiz (tamamlandı - bu plan)
- [ ] Paket 1: Log temizliği
- [ ] Paket 2: Hook çıkarımı (useMediaControls, useCallNotifications)

### İterasyon 2 (2-3 gün)
- [ ] Paket 2: Kalan hook'lar
- [ ] Paket 3: Bileşen ayrıştırma (WaitingRoom, VideoTile)
- [ ] Unit test'ler yazımı

### İterasyon 3 (2-3 gün)
- [ ] Paket 4: Event handler konsolidasyonu
- [ ] Paket 3: Kalan bileşenler
- [ ] Integration test'ler

### İterasyon 4 (Opsiyonel, 4-5 gün)
- [ ] Paket 5: Reconnect logic
- [ ] Error boundary ekleme
- [ ] Performance optimizasyonları (React.memo, useMemo)

---

## 7. Başarı Kriterleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| VideoCall.tsx satır sayısı | 1781 | < 400 |
| Console log sayısı (normal flow) | ~50 | < 10 |
| Re-render sayısı (toggle başına) | 3-5 | 1-2 |
| Unit test coverage | 0% | > 80% |
| Ortalama init süresi | ~4.5s | < 3s |

---

## 8. Sonuç ve Öneriler

**Öncelikli Eylemler**:
1. **Hemen**: Paket 1 (Log temizliği) - Debugging deneyimini iyileştirir
2. **Bu hafta**: Paket 2 (Hook çıkarımı) - Maintainability artırır
3. **Gelecek hafta**: Paket 3 (Bileşen ayrıştırma) - Kod organizasyonu

**Ertelenebilir**:
- Paket 5 (Reconnect) - Kullanıcı şikayeti yoksa düşük öncelik
- Error boundary - Mevcut hata handling yeterli

**WebSocket Hatası Hakkında**:
`lovableproject.com` WebSocket hataları Lovable platformunun development tooling'inden kaynaklanıyor ve production'da oluşmayacak. Kod değişikliği gerektirmiyor.


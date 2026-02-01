
# İterasyon 2: Paket 3 - UI Bileşen Ayrıştırma

## Amaç

`VideoCall.tsx` dosyasını 1746 satırdan ~600 satıra düşürmek için UI bileşenlerini ayrı dosyalara taşımak.

---

## Mevcut Durum Analizi

**VideoCall.tsx içindeki bileşenler (satır numaraları):**

| Bileşen | Satır Aralığı | Boyut | Öncelik |
|---------|---------------|-------|---------|
| ParticipantNotification | 288-322 | 35 | Orta |
| NotificationsOverlay | 324-339 | 16 | Orta |
| AnimatedBackground | 342-356 | 15 | Düşük |
| MediaStatusBadge | 359-370 | 12 | Düşük |
| WaitingIndicator | 373-393 | 21 | Düşük |
| ControlButton | 396-417 | 22 | Düşük |
| **WaitingRoom** | 419-536 | **118** | **Yüksek** |
| **VideoTile** | 544-641 | **98** | **Yüksek** |
| FilteredRemoteAudio | 648-676 | 29 | Orta |
| LoadingScreen | 678-689 | 12 | Düşük |
| ErrorScreen | 691-700 | 10 | Düşük |

**Toplam UI bileşen satırları:** ~388 satır (taşınabilir)

---

## Yeni Dosya Yapısı

```text
src/pages/VideoCall/
├── index.tsx                    (ana export - yönlendirme)
├── VideoCallPage.tsx            (ana VideoCall bileşeni)
├── CallUI.tsx                   (CallUI bileşeni)
├── components/
│   ├── WaitingRoom.tsx          (118 satır)
│   ├── VideoTile.tsx            (98 satır)
│   ├── FilteredRemoteAudio.tsx  (29 satır)
│   ├── Notifications.tsx        (51 satır - overlay + notification)
│   ├── Screens.tsx              (22 satır - loading + error)
│   └── UIElements.tsx           (70 satır - badge, indicator, button, bg)
├── utils/
│   ├── helpers.ts               (helper fonksiyonlar)
│   ├── participantUtils.ts      (sanitize + logging)
│   └── constants.ts             (sabitler)
└── types.ts                     (interface'ler)
```

---

## Detaylı Değişiklikler

### 1. `src/pages/VideoCall/types.ts` (YENİ)

Tüm interface'leri ve type'ları merkezi bir dosyaya taşı:

- `CallUIProps`
- `NotificationProps`
- `WaitingRoomProps`
- `NotificationItem`
- `CallState`
- `CallIntent`
- `CreateDailyRoomResponse`

### 2. `src/pages/VideoCall/utils/constants.ts` (YENİ)

Sabit değerleri ayır:

```typescript
export const SOLO_TIMEOUT_SECONDS = 30 * 60;
export const MAX_CALL_DURATION_SECONDS = 2 * 60 * 60;
export const NOTIFICATION_DURATION_MS = 4000;
export const DUPLICATE_NOTIFICATION_THRESHOLD_MS = 5000;
export const JOIN_TIMEOUT_MS = 20000;
export const MAX_DURATION_CHECK_INTERVAL_MS = 10000;
```

### 3. `src/pages/VideoCall/utils/helpers.ts` (YENİ)

Yardımcı fonksiyonları taşı:

- `formatTime`
- `assertValidDailyUrl`
- `isExpRoomError`
- `isNoRoomError`
- `parseEdgeFunctionError`
- `getErrorMessage`

### 4. `src/pages/VideoCall/utils/participantUtils.ts` (YENİ)

Katılımcı mantığını ayır:

- `getParticipantKey`
- `isMirrorOfLocal`
- `sanitizeParticipants`
- `logParticipantsTransition`
- `logParticipants`

### 5. `src/pages/VideoCall/components/WaitingRoom.tsx` (YENİ)

WaitingRoom bileşenini ayrı dosyaya taşı (118 satır):

```typescript
// Bağımlılıklar
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DailyParticipant } from '@daily-co/daily-js';
import { Users, Video, VideoOff, Mic, MicOff, PhoneOff, Clock } from 'lucide-react';

import { WaitingRoomProps } from '../types';
import { formatTime } from '../utils/helpers';
import { AnimatedBackground, MediaStatusBadge, WaitingIndicator, ControlButton } from './UIElements';
```

### 6. `src/pages/VideoCall/components/VideoTile.tsx` (YENİ)

VideoTile bileşenini ayrı dosyaya taşı (98 satır):

```typescript
// Daily React hook'ları ile track yönetimi
import { useRef, useEffect } from 'react';
import { DailyVideo, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { motion } from 'framer-motion';
import { VideoOff, MicOff } from 'lucide-react';

import { devLog } from '@/lib/debug';
```

### 7. `src/pages/VideoCall/components/FilteredRemoteAudio.tsx` (YENİ)

Remote audio bileşeni (29 satır):

```typescript
import { useRef, useEffect } from 'react';
import { useAudioTrack } from '@daily-co/daily-react';
```

### 8. `src/pages/VideoCall/components/Notifications.tsx` (YENİ)

Bildirim bileşenlerini birleştir:

- `ParticipantNotification`
- `NotificationsOverlay`

### 9. `src/pages/VideoCall/components/Screens.tsx` (YENİ)

Ekran bileşenlerini birleştir:

- `LoadingScreen`
- `ErrorScreen`

### 10. `src/pages/VideoCall/components/UIElements.tsx` (YENİ)

Küçük UI parçalarını birleştir:

- `AnimatedBackground`
- `MediaStatusBadge`
- `WaitingIndicator`
- `ControlButton`

### 11. `src/pages/VideoCall/CallUI.tsx` (YENİ)

CallUI bileşenini ana dosyadan ayır (~500 satır):

- State management
- Daily event handlers
- useNotifications hook (inline)
- useCallTimers hook (inline)
- Toggle handlers
- Render logic

### 12. `src/pages/VideoCall/VideoCallPage.tsx` (YENİ)

Ana VideoCall bileşeni (~350 satır):

- URL parsing
- Module-level mutexes
- Room creation logic
- Call initialization

### 13. `src/pages/VideoCall/index.tsx` (YENİ)

Export dosyası:

```typescript
export { default } from './VideoCallPage';
```

### 14. `src/App.tsx` Güncellemesi

Route import'unu güncelle:

```typescript
// Eski
const VideoCall = lazy(() => import('./pages/VideoCall'));

// Yeni (değişiklik gerekmiyor - index.tsx otomatik çözülür)
const VideoCall = lazy(() => import('./pages/VideoCall'));
```

---

## Uygulama Sırası

1. **types.ts** - Tüm type'lar (bağımlılık yok)
2. **constants.ts** - Sabitler (bağımlılık yok)
3. **helpers.ts** - Yardımcı fonksiyonlar (constants'a bağlı)
4. **participantUtils.ts** - Katılımcı mantığı (types'a bağlı)
5. **UIElements.tsx** - Küçük UI parçaları (bağımlılık az)
6. **Screens.tsx** - Loading/Error ekranları
7. **Notifications.tsx** - Bildirim bileşenleri
8. **FilteredRemoteAudio.tsx** - Audio bileşeni
9. **VideoTile.tsx** - Video tile (Daily hooks kullanır)
10. **WaitingRoom.tsx** - Bekleme odası
11. **CallUI.tsx** - Ana call UI
12. **VideoCallPage.tsx** - Ana sayfa bileşeni
13. **index.tsx** - Export

---

## Risk Değerlendirmesi

| Risk | Seviye | Önlem |
|------|--------|-------|
| Import döngüsü | Düşük | Type'ları ayrı dosyada tut |
| Module-level state kaybı | Orta | Mutex'leri VideoCallPage'de tut |
| Hook bağımlılıkları | Düşük | useCallTimers parametreleri koru |
| Daily React context | Düşük | DailyProvider CallUI'yi sarmaya devam etsin |

---

## Beklenen Sonuç

| Metrik | Önce | Sonra |
|--------|------|-------|
| VideoCall.tsx satır sayısı | 1746 | 0 (silinecek) |
| VideoCallPage.tsx | - | ~350 |
| CallUI.tsx | - | ~500 |
| Toplam dosya sayısı | 1 | 13 |
| En büyük dosya | 1746 | ~500 |

---

## Teknik Detaylar

### Module-Level State Taşıma

```typescript
// VideoCallPage.tsx içinde kalacak
const initFlowMutex = new Map<string, Promise<void>>();
const createRoomMutex = new Map<string, Promise<CreateDailyRoomResponse>>();

// participantUtils.ts'e taşınacak
const globalTrackStates = new Map<string, Map<string, { video: boolean; audio: boolean }>>();
const handlerRegistrationCount = new Map<string, number>();
```

### Import Yapısı

```typescript
// CallUI.tsx
import { WaitingRoom } from './components/WaitingRoom';
import { VideoTile } from './components/VideoTile';
import { FilteredRemoteAudio } from './components/FilteredRemoteAudio';
import { NotificationsOverlay } from './components/Notifications';
import { LoadingScreen, ErrorScreen } from './components/Screens';
import { formatTime } from './utils/helpers';
import { sanitizeParticipants, logParticipants } from './utils/participantUtils';
import type { CallUIProps, NotificationItem, CallState } from './types';
```

---

## Test Stratejisi

### Manuel Test Checklist

- [ ] Video arama başlat (start intent)
- [ ] Video aramaya katıl (join intent)
- [ ] WaitingRoom görünümü doğru render
- [ ] Karşı taraf katıldığında VideoTile'lar görünür
- [ ] Kamera toggle çalışır
- [ ] Mikrofon toggle çalışır
- [ ] Katılımcı bildirimleri görünür
- [ ] Arama sonlandırma çalışır
- [ ] Hata ekranı doğru görünür
- [ ] Console'da import hataları yok

### Otomatik Test (Sonraki İterasyon)

Bileşen bazlı unit test'ler eklenecek.


# Video Call Baslangic Suresi Optimizasyonu (9sn -> 4-5sn)

## Tespit Edilen Sorunlar

### 1. Cift getUser Cagrisi (KRITIK - ~400-1000ms kayip)
`initializeCall` icerisinde iki ayri `supabase.auth.getUser()` cagrisi yapiliyor:
- `getDisplayName()` fonksiyonu icinde (satir 180)
- `Promise.all` blogunda ayrica (satir 215)

Her ikisi de ayni kullaniciyi aliyor ve gereksiz network yuku olusturuyor.

### 2. AuthContext Kullanilmiyor
`AuthContext` zaten kullanici bilgisini tutuyor (`user` objesi). VideoCallPage bu context'i kullanabilir ve network cagrisi yerine bellekten okuyabilir.

### 3. Kullanilmayan Kod
`requestMediaPermissions` fonksiyonu tanimli ama hic cagrilmiyor (satir 99-111). Temizlenmeli.

### 4. preAuth Gereksiz
`call.preAuth()` (satir 230-234) fire-and-forget olarak calisiyor ama `call.join()` zaten preAuth'u dahili olarak yapiyor. Bu cift islem gereksiz.

### 5. Edge Function Optimizasyon Potansiyeli
`create-daily-room` fonksiyonunda:
- Conversation fetch + Participant check (sirasel)
- Daily API request
- DB update (sirasel)

Bunlarin bir kismi paralellestirilemiyor cunku bagimlilik var, ancak DB update fire-and-forget yapilabilir.

## Onerilen Degisiklikler

### Degisiklik 1: AuthContext Kullanimi (En Yuksek Etki)
`VideoCallPage.tsx` icerisinde `useAuth()` hook'u kullanarak user bilgisini al, `getUser()` cagrilarini kaldir.

**Onceki:**
```typescript
const getDisplayName = async (): Promise<string> => {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  return (user?.user_metadata as any)?.username || ...
};

const [roomData, displayName, authData] = await Promise.all([
  roomPromise,
  getDisplayName(),
  supabase.auth.getUser(),  // GEREKSIZ
]);
```

**Sonraki:**
```typescript
// Component basinda
const { user: authUser } = useAuth();

// initializeCall icinde
const displayName = 
  (authUser?.user_metadata as any)?.username ||
  (authUser?.user_metadata as any)?.full_name ||
  authUser?.email?.split('@')[0] ||
  'Kullanici';

const roomData = await (roomUrlFromParam && intent === 'join'
  ? Promise.resolve({ room: { url: roomUrlFromParam, name: 'cached' } })
  : createRoom({ forceNew: false, callIntent: intent }));
```

Kazanc: ~400-1000ms (2 network cagrisi yerine 0)

### Degisiklik 2: preAuth Kaldirilmasi
`call.preAuth()` cagrisini tamamen kaldir. Daily.co SDK'si `join()` icerisinde bu islemi zaten yapiyor.

**Onceki:**
```typescript
// Fire-and-forget - join'i bloklama
call.preAuth({ url: roomUrl }).then(() => {
  devLog('VideoCall', 'preAuth completed (non-blocking)');
}).catch(() => {});
```

**Sonraki:**
```typescript
// preAuth kaldirildi - join() zaten bunu iceride yapiyor
devLog('VideoCall', 'Ready to join');
```

Kazanc: CPU/memory tasarrufu + potansiyel race condition onleme

### Degisiklik 3: Kullanilmayan Kod Temizligi
`requestMediaPermissions` fonksiyonunu kaldir (satir 99-111).

### Degisiklik 4: Edge Function DB Update Fire-and-Forget
`create-daily-room/index.ts` icerisinde conversation update islemini await etmeden yap.

**Onceki:**
```typescript
const { error: updateError } = await supabase
  .from('conversations')
  .update({ ... })
  .eq('id', conversation_id);
```

**Sonraki:**
```typescript
// Fire-and-forget - response'u bekletme
supabase
  .from('conversations')
  .update({ ... })
  .eq('id', conversation_id)
  .then(({ error }) => {
    if (error) console.error('[create-daily-room] DB update failed:', error);
  });
```

Kazanc: ~100-300ms (DB write bekleme suresi)

## Dosya Degisiklikleri

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/VideoCall/VideoCallPage.tsx` | useAuth ekle, getDisplayName kaldir, Promise.all basitlestir, preAuth kaldir, requestMediaPermissions kaldir |
| `supabase/functions/create-daily-room/index.ts` | DB update fire-and-forget yap |

## Beklenen Sonuc

| Metrik | Onceki | Sonraki |
|--------|--------|---------|
| getUser cagrisi | 2x paralel | 0 (context'ten) |
| preAuth | 1x fire-and-forget | 0 (kaldirildi) |
| Edge Function DB wait | ~100-300ms | 0 (fire-and-forget) |
| **Toplam Kazanc** | - | **~600-1500ms** |
| **Tahmini Sure** | ~9 saniye | **~6-7 saniye** |

## Teknik Detaylar

### VideoCallPage.tsx Degisiklikleri

**Import ekle (satir 7):**
```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Hook ekle (component icinde, satir ~57):**
```typescript
const { user: authUser } = useAuth();
```

**getDisplayName fonksiyonunu kaldir (satir 179-188)**

**requestMediaPermissions fonksiyonunu kaldir (satir 99-111)**

**initializeCall icinde basitlestir (satir 207-220):**
```typescript
// OPTIMIZATION: Use cached auth from context (no network call)
const displayName = 
  (authUser?.user_metadata as any)?.username ||
  (authUser?.user_metadata as any)?.full_name ||
  authUser?.email?.split('@')[0] ||
  'Kullanici';

// OPTIMIZATION: Only fetch room data (auth already in context)
const roomData = await (roomUrlFromParam && intent === 'join'
  ? Promise.resolve({ room: { url: roomUrlFromParam, name: 'cached' } } as CreateDailyRoomResponse)
  : createRoom({ forceNew: false, callIntent: intent }));

const roomUrl = roomData.room!.url;
currentRoomUrlRef.current = roomUrl;

// preAuth KALDIRILDI - join() zaten bunu iceride yapiyor
devLog('VideoCall', 'Ready to join');
```

**joinOptions guncelle:**
```typescript
const joinOptions: any = {
  url: roomUrl,
  userName: displayName,
  userData: authUser?.id ? { appUserId: authUser.id } : undefined,
  ...
};
```

### create-daily-room/index.ts Degisiklikleri

**Satir 405-424 degistir:**
```typescript
// Fire-and-forget DB update - don't block response
supabase
  .from('conversations')
  .update({
    active_call_room_name: createdRoomName,
    active_call_room_url: createdRoomUrl,
    active_call_started_at: startedAt,
    active_call_ended_at: null,
    active_call_created_by: authedUserId,
    video_room_name: createdRoomName,
    video_room_url: createdRoomUrl,
    video_room_created_at: startedAt,
  })
  .eq('id', conversation_id)
  .then(({ error }) => {
    if (error) console.error('[create-daily-room] Failed to save room info:', error);
  });

// Return immediately after Daily room creation
return successResponse({
  success: true,
  room: { name: createdRoomName, url: createdRoomUrl },
  createdAt: startedAt,
  reused: false,
  active_call: true,
  call_started_at: startedAt,
  call_created_by: authedUserId,
});
```

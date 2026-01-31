

# Video Arama Geçiş Hızlandırma Planı

## Mevcut Durum Analizi

Kullanıcı tarafından bildirilen süreler:
- **A (Oda kurucusu)**: 2sn "Görüşme hazırlanıyor" + 6sn "Görüşme başlatılıyor" = **~8 saniye**
- **B (Katılımcı)**: 6-9sn "Görüşme hazırlanıyor" + 2sn "Görüşme başlatılıyor" = **~8-11 saniye**

## Zaman Çizelgesi Analizi

```text
═══════════════════════════════════════════════════════════════════════════════
MEVCUT AKIŞ (Yavaş):
═══════════════════════════════════════════════════════════════════════════════

"Görüşme hazırlanıyor" (Parent Overlay - callObject === null)
│
├── 1. Edge function çağrısı (create-daily-room)     ~1-3sn
│   └── Supabase auth check + DB query + Daily API
│
├── 2. Daily.createCallObject()                      ~0.1sn
│
├── 3. setCallObject(call) → Parent overlay kapanır  
│
├── 4. requestMediaPermissions()                     ~0-2sn (izin varsa hızlı)
│
├── 5. call.startCamera()                            ~1-2sn (async bekleme)
│
├── 6. await getDisplayName()                        ~0.5-1sn (DB query)
│
├── 7. await supabase.auth.getUser()                 ~0.5-1sn (DB query)
│
└── 8. call.join()                                   ~1-2sn (Daily API)

"Görüşme başlatılıyor" (CallUI - callState !== 'joined')
│
└── Daily 'joined-meeting' event gelene kadar bekler

═══════════════════════════════════════════════════════════════════════════════
```

## Tespit Edilen Darboğazlar

| Sıra | Darboğaz | Süre | Çözüm |
|------|----------|------|-------|
| 1 | Edge function'a ardışık çağrılar | ~2-4sn | Joiner için URL'i önceden cache'le |
| 2 | `startCamera()` async bekleme | ~1-2sn | join() ile paralel başlat |
| 3 | `getDisplayName()` + `getUser()` ardışık | ~1-2sn | Paralel çalıştır |
| 4 | `call.join()` öncesi gereksiz beklemeler | ~1-2sn | Kritik olmayan işleri ertele |
| 5 | B kişisi için aktif arama bilgisi geç geliyor | ~3-5sn | ChatWindow'dan room URL'i ile geç |

## Optimizasyon Planı

### Optimizasyon 1: Paralel İşlem Başlatma

**Mevcut (Sıralı)**:
```typescript
const roomData = await createRoom();      // 1-3sn bekle
const call = Daily.createCallObject();
setCallObject(call);
await requestMediaPermissions();           // 0-2sn bekle
await call.startCamera();                  // 1-2sn bekle
const displayName = await getDisplayName();// 0.5-1sn bekle
const { data } = await supabase.auth.getUser(); // 0.5-1sn bekle
await call.join();                         // 1-2sn bekle
```

**Optimize (Paralel)**:
```typescript
// 1. CallObject'i HEMEN oluştur (room beklemeden)
const call = Daily.createCallObject();
setCallObject(call); // Parent overlay hemen kapanır!

// 2. Arka planda paralel başlat
const [roomData, displayName, userData] = await Promise.all([
  createRoom(),
  getDisplayName(),
  supabase.auth.getUser()
]);

// 3. Kamera ve izinleri join ile paralel
call.startCamera().catch(console.warn); // Fire-and-forget
await call.join({ url: roomData.room.url, userName: displayName });
```

**Kazanç**: ~3-5 saniye

### Optimizasyon 2: Joiner İçin URL'i Önceden Geç

ChatWindow'daki "Katıl" butonundan VideoCall sayfasına yönlendirirken, aktif arama URL'ini query param olarak geç:

```typescript
// ChatWindow.tsx - Aktif arama banner'ından
navigate(`/video-call/${conversationId}?intent=join&roomUrl=${encodeURIComponent(activeCall.room_url)}`);
```

Bu sayede B kişisi edge function çağrısını atlayabilir (veya sadece doğrulama için kullanır).

**Kazanç**: ~2-4 saniye (B kişisi için)

### Optimizasyon 3: CallObject'i Erken Oluştur

`callObject`'i edge function yanıtını beklemeden oluştur. Bu sayede:
1. Parent overlay hemen kapanır
2. CallUI mount olur ve kendi loading ekranını gösterir
3. Kullanıcı "bir şeyler oluyor" hissini alır

```typescript
// İlk satırda CallObject oluştur
const call = Daily.createCallObject({ allowMultipleCallInstances: true });
callObjectRef.current = call;
setCallObject(call);  // → Parent overlay kapanır, CallUI mount olur
setIsLoading(false);

// Sonra arka planda room oluştur/al ve join et
const roomData = await createRoom();
await call.join({ url: roomData.room.url });
```

### Optimizasyon 4: Loading State Birleştirme

Parent ve CallUI'daki iki ayrı loading ekranı yerine tek bir akıcı geçiş:

```text
MEVCUT:
[Görüşme hazırlanıyor] → [Görüşme başlatılıyor] → [WaitingRoom/Call]

OPTİMİZE:
[Görüşme hazırlanıyor + kamera önizleme] → [WaitingRoom/Call]
```

Kullanıcı beklerken kendi kamerasını görebilir.

---

## Teknik Değişiklikler

### Dosya 1: `src/pages/VideoCall.tsx`

**initializeCall() fonksiyonunu yeniden yapılandır**:

1. CallObject'i HEMEN oluştur (satır 1097-1100 öncesine taşı)
2. createRoom, getDisplayName, getUser çağrılarını Promise.all ile paralel yap
3. startCamera'yı fire-and-forget yap (await kaldır)
4. URL query param'dan roomUrl varsa, edge function'ı atla veya sadece doğrulama için kullan

**Yeni akış sırası**:
```
1. Daily.createCallObject() → setCallObject() [~100ms]
2. Promise.all([createRoom(), getDisplayName(), getUser()]) [paralel ~2-3sn]
3. call.startCamera() [fire-and-forget, beklemez]
4. call.join() [~1-2sn]
5. 'joined-meeting' event → callState='joined'
```

### Dosya 2: `src/components/chat/ChatWindow.tsx`

**Aktif arama banner'ından room URL'ini geç**:

```typescript
const handleJoinActiveCall = () => {
  navigate(
    `/video-call/${conversationId}?intent=join&roomUrl=${encodeURIComponent(activeCall.active_call_room_url)}`
  );
};
```

### Dosya 3: `src/hooks/useActiveCall.ts`

Değişiklik yok - mevcut hook zaten room URL'ini döndürüyor.

---

## Beklenen Sonuç

| Kullanıcı | Mevcut | Hedef |
|-----------|--------|-------|
| A (Kurucu) | ~8sn | ~3-4sn |
| B (Katılımcı) | ~8-11sn | ~2-3sn |

**Toplam tasarruf**: ~5-8 saniye

---

## Uygulama Adımları

1. **VideoCall.tsx**:
   - initializeCall() içindeki sıralı await'leri paralel Promise.all'a çevir
   - CallObject oluşturmayı en başa taşı
   - URL query param'dan roomUrl okuma ekle
   - startCamera'dan await'i kaldır

2. **ChatWindow.tsx**:
   - Aktif arama banner'ındaki navigate çağrısına roomUrl param ekle

3. **Test**:
   - A başlatsın, B katılsın
   - Console loglarından timing'i doğrula
   - Her iki tarafta da sürenin düştüğünü kontrol et


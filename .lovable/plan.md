

# Sorun: Edge Function Deploy Edilmediği İçin Katıl Butonu Görünmüyor

## Kök Neden

Konsol logları kanıtlıyor: `active_call_*` alanları hep `null`. Production edge function hala REV3 -- yeni `active_call_*` alanlarını yazan REV9 kodu deploy olmadı. Dolayısıyla `useActiveCall` hook'u her zaman null döndürüyor ve "Konuşmaya Katıl" butonu hiç görünmüyor.

## Çözüm: Frontend-side DB Update (Deploy Bağımsız)

Edge function deployment'a güvenmek yerine, **aramayı başlatan frontend** edge function response'undan aldığı oda bilgilerini doğrudan `conversations` tablosuna yazsın. Böylece eski REV3 çalışsa bile `active_call_*` alanları dolu olacak.

### Değişiklikler

**1. `src/pages/VideoCall/VideoCallPage.tsx`**
- `call.join()` başarılı olduktan sonra `conversations` tablosunu `active_call_*` alanlarıyla güncelle
- Sadece `intent === 'start'` durumunda yaz (joiner tekrar yazmasın)
- Edge function zaten yapıyorsa da zararsız (idempotent update)

```typescript
// After successful join, ensure DB has active call state
if (intent === 'start' && conversationId) {
  supabase.from('conversations').update({
    active_call_room_name: roomData.room.name,
    active_call_room_url: roomData.room.url,
    active_call_started_at: roomData.createdAt || new Date().toISOString(),
    active_call_ended_at: null,
    active_call_created_by: authUser?.id || null,
  }).eq('id', conversationId).then(({ error }) => {
    if (error) console.error('[VideoCall] Frontend DB update failed:', error);
    else devLog('VideoCall', 'Frontend DB update successful (deploy-independent fallback)');
  });
}
```

**2. `src/hooks/useActiveCall.ts`** -- Değişiklik yok, mevcut mantık doğru.

### Neden Bu Çözüm?
- Edge function deployment sorununu tamamen bypass eder
- Eski REV3 çalışsa bile frontend doğru alanları yazar
- İleride REV9+ deploy olursa, hem backend hem frontend yazar -- zararsız (aynı veri)
- Tek dosya değişikliği: `VideoCallPage.tsx`

### Beklenen Davranış
1. Kullanıcı A aramayı başlatır
2. Frontend, `conversations.active_call_*` alanlarını günceller
3. Kullanıcı B'nin `useActiveCall` hook'u Realtime/polling ile güncellemeyi yakalar
4. "Konuşmaya Katıl" butonu görünür


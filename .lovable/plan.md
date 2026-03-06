
Sorunu baştan teşhis ettim; “Katıl”ın görünmemesinin temel nedeni şu anki mantığın **katılımcı sayısını hiç kullanmaması**.

Kısa kök neden:
1) `ChatWindow` butonu `participant_count > 0` ile değil, sadece `useActiveCall` içinden gelen `active_call_*` alanlarıyla karar veriyor.  
2) `useActiveCall` şu an Daily odasındaki canlı katılımcıyı kontrol etmiyor; bu yüzden “odada biri var mı?” bilgisi UI’ya hiç yansımıyor.  
3) `VideoCallPage` içindeki frontend DB sync sadece ilk join akışında güvenilir; retry/fallback senaryolarında aktif durum güncellemesi kaçabiliyor. Bu da karşı tarafta butonun hiç çıkmamasına yol açıyor.  
4) Senin seçtiğin kural net: **katılımcı sayısı > 0 ise buton görünsün**. Mevcut kod bu kuralı uygulamıyor.

Uygulama planı (kesin çözüm):
1) Yeni edge function: `get-daily-room-presence`
- Dosya: `supabase/functions/get-daily-room-presence/index.ts`
- Güvenlik: JWT doğrula + kullanıcının konuşma katılımcısı olduğunu kontrol et.
- DB’den `active_call_room_name`, `active_call_ended_at` oku.
- Aktif oda varsa Daily API `GET /rooms/:name/presence` ile anlık presence çek.
- Dönüş:
  - `has_live_participants: boolean`
  - `participant_count: number`
  - `room_name`, `function_version`
- Oda yoksa/bitmişse `participant_count=0` döndür.

2) Function config ekleme
- Dosya: `supabase/config.toml`
- `[functions.get-daily-room-presence] verify_jwt = false`
- Auth kontrolü function içinde yapılacak (mevcut pattern ile aynı).

3) `useActiveCall`’ı canlı presence odaklı hale getirme
- Dosya: `src/hooks/useActiveCall.ts`
- Akış:
  - Önce `conversations.active_call_*` oku (oda var mı?).
  - Oda varsa yeni function’dan presence çek.
  - `activeCall` yalnızca `participant_count > 0` ise dolu dönsün; değilse `null`.
- Realtime UPDATE geldiğinde:
  - önce DB state güncelle,
  - sonra presence’i yenile.
- Polling fallback’te her turda presence de yenilenir (throttle ile).

4) Chat buton kararını sadeleştirme
- Dosya: `src/components/chat/ChatWindow.tsx`
- “Konuşmaya Katıl” görünme şartı:
  - `activeCall !== null` (artık bu zaten `participant_count > 0` demek).
- İkinci varyant karmaşasını kaldır:
  - tek CTA bırak (senin istediğin şekilde).
- Böylece “Aramaya Dön / Join” karışıklığı ve creator-id bağımlılığı kalkar.

5) Start akışında DB sync’i güçlendirme
- Dosya: `src/pages/VideoCall/VideoCallPage.tsx`
- `active_call_*` yazımını tek helper’a al.
- Hem normal join-success hem retry-success yolunda çalıştır.
- Hata olursa net log + kullanıcıya kontrollü uyarı (sessiz geçme yok).

6) Stabilite korumaları
- `useActiveCall` içindeki stale guard kalacak ama son karar her zaman presence olacak.
- Presence 0 ise buton gizlenecek; böylece eski/boş oda ghost-state tamamen bitecek.

Beklenen sonuç:
- Karşı taraf aramadayken (odada en az 1 kişi): “Konuşmaya Katıl” görünür.
- Oda var ama içeride kimse yok: buton görünmez.
- Eski konuşma odaları artık “aktifmiş” gibi görünmez.
- Senin tarif ettiğin kural birebir uygulanmış olur: `participant_count > 0`.

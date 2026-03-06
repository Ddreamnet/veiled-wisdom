
Hedefi kökten çözmek için zinciri inceledim; sorun tek katmanda değil, iki kritik kırılma noktası var.

1) Asıl kök neden (teşhis)
- Katman 1 (DB yazımı): `supabase/functions/create-daily-room/index.ts` içinde aktif çağrı alanları (`active_call_*`) **fire-and-forget** güncelleniyor (await yok). Fonksiyon success döndükten sonra runtime işi keserse veya geç işlerse, karşı tarafın chat’i “aktif çağrı”yı zamanında/garanti şekilde göremeyebiliyor.
- Katman 2 (realtime dayanıklılığı): `src/hooks/useActiveCall.ts` sadece realtime `UPDATE` dinliyor ama:
  - subscribe status (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) izlemiyor
  - fallback polling/refetch yok
  - dolayısıyla realtime koparsa state stale kalıyor (refresh’e kadar).
- Bu kombinasyon, “karşı taraf başlattı ama buton otomatik Katıl’a dönmedi” semptomunu doğuruyor.

2) Akış haritası (uçtan uca)
- `ChatWindow.tsx`:
  - buton -> `handleStartCall()` => `/call/:conversationId`
  - aktif çağrı varsa `handleJoinCall()` => `/call/:conversationId?intent=join&roomUrl=...`
- `VideoCallPage.tsx`:
  - `create-daily-room` çağırıyor (`intent=start|join`)
- `create-daily-room`:
  - aktif çağrı varsa reuse
  - yoksa yeni room oluşturuyor
  - sonra `conversations.active_call_*` set etmeye çalışıyor (şu an await’siz)
- `useActiveCall.ts`:
  - initial fetch + realtime `UPDATE` ile `activeCall` state üretip `ChatWindow`’a veriyor
- `ChatWindow.tsx` render:
  - `activeCall && activeCall.created_by !== user?.id` ise “karşı taraf başlattı” branch’i

3) Waiting ekranında ne oluyor?
- İlk başlatan kullanıcı waiting’de kalsa bile aktif çağrı state’i aslında **create-daily-room sırasında** yazılmalı.
- Ancak bu yazım şu an await’siz olduğu için “hemen ve garanti” değil; kök sorunlardan biri bu.

4) Neden realtime “Konuşmaya Katıl”a dönmüyordu?
- Çünkü `useActiveCall` realtime event’e bağımlı ama realtime başarısız/bağlanmamış durumda fallback yok.
- Üstüne DB aktif çağrı yazımı da await’siz olduğundan event tetikleme anı garanti değil.
- Sonuç: state güncellenmeyince UI branch değişmiyor.

5) Kalıcı çözüm planı (uygulanacak değişiklikler)
A) `supabase/functions/create-daily-room/index.ts`
- `conversations` update’ini await’li hale getir.
- DB update başarısızsa success dönme; hata dön (`DB_UPDATE_FAILED`).
- Gerekirse yeni oluşan Daily room’u rollback/cleanup et (en azından log + deterministik hata).

B) `src/hooks/useActiveCall.ts`
- Realtime subscribe callback’i ekle:
  - `SUBSCRIBED` -> connected=true
  - `CHANNEL_ERROR|TIMED_OUT|CLOSED` -> connected=false + polling/refetch başlat
- `useMessages`teki gibi güvenlik fallback:
  - 2-3 sn içinde subscribe yoksa polling
  - polling: `fetchActiveCall()` (ör. 2s -> 5s -> 10s max)
- Realtime event geldiğinde polling’i durdur.
- Conversation değişiminde channel/timer cleanup garanti et.

C) `src/components/chat/ChatWindow.tsx`
- Buton durumlarını net ayır:
  1. aktif çağrı yok -> normal video icon
  2. aktif çağrı + karşı taraf başlattı -> yeşil “Konuşmaya Katıl” CTA (hafif animate-in/pulse)
  3. aktif çağrı + ben başlattım -> nötr “Aramaya Dön” veya yeşil aktif icon
- Metni netleştir: “Katıl” yerine “Konuşmaya Katıl”.
- Banner ile görsel çakışmayı azalt (CTA boyutu/padding kontrollü, mobilde taşmayacak).

6) Dokunulacak dosyalar
- `supabase/functions/create-daily-room/index.ts` (kritik)
- `src/hooks/useActiveCall.ts` (kritik)
- `src/components/chat/ChatWindow.tsx` (UI davranışı)

7) Beklenen final davranış (3 senaryo)
1. Aktif arama yok:
- Sağ üstte normal video icon.
2. Karşı taraf aramayı başlatır:
- Ben chat içindeyken refresh olmadan otomatik state update.
- Video icon -> animasyonlu yeşil “Konuşmaya Katıl”.
3. Arama biter:
- `active_call_ended_at` ile state null’a iner.
- Buton otomatik normal video icon’a döner.

8) Neden önceki denemeler yetmedi?
- Sadece render/UI tarafı güncellendi; altyapıdaki iki ana kırılma (DB write guarantee + realtime fallback) çözülmedi.
- Bu yüzden ikon/CTA branch’i doğru olsa bile tetikleyen state güvenilir değildi.

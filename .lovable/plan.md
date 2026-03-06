

# Video Call Oda Durumu ve "Konuşmaya Katıl" Butonu -- Teknik Analiz

## A) Mevcut Video Call Akışı

**Video call butonu:** `src/components/chat/ChatWindow.tsx` satir 188-203. Sag ustteki `<Video />` ikon butonu.

**Tiklama akisi:**
- `activeCall` varsa → `handleJoinCall()` → `/call/{conversationId}?intent=join&roomUrl=...`
- `activeCall` yoksa → `handleStartCall()` → `/call/{conversationId}`
- Route handler: `src/pages/VideoCall/VideoCallPage.tsx`

**Altyapi:** Daily.co (WebRTC). Oda olusturma `create-daily-room` Edge Function uzerinden yapiliyor.

## B) Oda Durumu Su An Nasil Takip Ediliyor

**DB-tabanli aktif arama takibi.** `conversations` tablosunda su kolonlar var:

| Kolon | Aciklama |
|---|---|
| `active_call_room_name` | Daily.co oda adi |
| `active_call_room_url` | Daily.co oda URL'i |
| `active_call_started_at` | Arama baslama zamani |
| `active_call_ended_at` | Arama bitis zamani (null = aktif) |
| `active_call_created_by` | Aramayi baslatan kullanici ID |

**Hook:** `useActiveCall(conversationId)` -- `conversations` tablosundan bu alanlari okur. **Realtime subscription** ile `postgres_changes` dinler, yani arama basladiginda/bittiginde anlik guncellenir.

**Onemli:** Bu sistem "odada biri var mi" degil, "aktif bir arama oturumu var mi" sorusunu yanitliyor. Yani:
- Kullanici A aramayi baslatinca `active_call_started_at` dolduruluyor, `created_by` set ediliyor
- Kullanici B bunu realtime ile goruyor ve banner + yesil buton gosteriyor
- Arama bitince `active_call_ended_at` dolduruluyor

## C) "Odada Biri Var" Bilgisini Alabiliyor muyuz?

**EVET -- zaten aliniyor ve kullaniliyor.** `useActiveCall` hook'u tam olarak bu isi yapiyor:

- `activeCall !== null` → odada aktif bir arama var (biri baslatti)
- `activeCall.created_by !== user.id` → aramayi baska biri baslatti (yani odada biri var)
- `activeCall.created_by === user.id` → kendin baslattin

**ChatWindow.tsx satir 77:** `const isCallStartedByOther = activeCall && activeCall.created_by !== user?.id;`

**Halihazirda mevcut UI davranisi:**
1. Aktif arama varsa: yesil banner gosteriliyor (satir 94-132)
2. Sag ustteki video butonu zaten kosullu renk degistiriyor: `activeCall ? "bg-green-500/10 text-green-500" : "hover:bg-primary/10"` (satir 196-199)
3. Buton tiklama da kosullu: `activeCall ? handleJoinCall : handleStartCall` (satir 191)

## D) En Dogru Implementation Yaklasimi

Sistem zaten neredeyse istediginiz seyi yapiyor. Eksik olan sadece **butonun gorsel olarak "Konusmaya Katil" yazisi gostermesi**. Su an sadece ikon rengi degisiyor, metin yok.

**Onerilen degisiklik (tek dosya):** `ChatWindow.tsx` satir 188-203

- `activeCall && isCallStartedByOther` durumunda: Video ikon butonu yerine yesil "Katil" text butonu goster
- `activeCall && !isCallStartedByOther` durumunda: Yesil ikon (kendin iceridesin, tekrar katil)
- `!activeCall` durumunda: mevcut ghost video ikon butonu

## E) Eksik Olan Ne?

**Katilimci sayisi bilgisi eksik.** Sistem "arama aktif mi" bilir ama "kac kisi icerde" bilmez. Bunun icin:

- **Daily.co REST API** ile `GET /rooms/{name}/presence` sorgulanabilir (sunucu tarafinda)
- Veya DB'ye `active_call_participant_count` gibi bir alan eklenebilir (client join/leave'de guncellenir)
- Ancak **mevcut senaryo icin buna gerek yok**: 1-1 sohbet sistemi, max 2 katilimci. `activeCall` varsa biri icerde demektir.

**"Iki kisi de icerdeyse" durumu:** Kullanici zaten arama ekraninda olacagi icin mesajlasma ekranini gormeyecek. Bu edge case pratikte olusmaz.

## F) Bu Ozellik Icin Dokunulacak Dosyalar

| Dosya | Degisiklik |
|---|---|
| `src/components/chat/ChatWindow.tsx` | Video butonunu kosullu olarak "Katil" CTA'sina donustur |

Tek dosya. `useActiveCall` hook'u ve realtime altyapisi zaten mevcut ve calisiyor. Ek hook, DB degisikligi veya edge function degisikligi gerekmiyor.


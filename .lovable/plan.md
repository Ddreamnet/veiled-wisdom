

# Admin Masaustunde Mesaj Ikonu + Bildirim Sistemi Iyilestirmesi

## 1. Admin Mesaj Ikonu (Header.tsx)

**Sorun:** Satir 103'te `{role !== "admin" && (` kosulu mesaj ikonunu admin icin gizliyor.

**Cozum:** Bu kosulu kaldir. Mesaj ikonu tum roller icin (admin, teacher, customer) gorunecek.

**Dosya:** `src/components/Header.tsx` — satir 103'teki `role !== "admin"` kontrolunu kaldir.

---

## 2. Bildirim Sistemi Sorunlari (useUnreadCount.ts)

Mevcut kodu inceledim, su sorunlar var:

### Sorun A: Realtime UPDATE event'inde `old` verisi bos gelir
Supabase Realtime'da `postgres_changes` UPDATE event'lerinde `payload.old` sadece tablo `REPLICA IDENTITY FULL` olarak ayarlandiysa dolu gelir. Varsayilan ayarda `old.read` her zaman `undefined` olur, yani mesaj okundu olarak isaretlendiginde `unreadCount` hic azalmaz.

**Cozum:** `old.read === false` kontrolu yerine sadece `updatedMessage.read === true` kontrolu yap ve `fetchUnreadCount()` ile tam sayimi yeniden cek. Bu, veritabanindan dogru sayiyi almayi garanti eder.

### Sorun B: Yeni konusma basladiginda conversationIdsRef guncellenmez
Kullanici yeni bir konusma baslatirsa, `conversationIdsRef` eski kalir ve yeni konusmadan gelen mesajlar bildirimde gozukmez.

**Cozum:** `conversation_participants` tablosuna INSERT listener ekle. Yeni katilim geldiginde `fetchUnreadCount()` cagir — bu hem conversation ID listesini hem de sayiyi gunceller.

### Sorun C: Birden fazla mesaj ayni anda okunursa sayac yanlis hesaplanir
Bir sohbet acildiginda tum mesajlar toplu okunur ama her UPDATE icin ayri ayri `-1` yapilir. Race condition sonucu negatif sayiya dusebilir veya yanlis kalabilir.

**Cozum:** UPDATE event'inde artimsal azaltma yerine `fetchUnreadCount()` ile tam veritabani sayimi yap. Debounce (300ms) ile ayni anda gelen cok sayida UPDATE'i tek bir sorguya indirge.

---

## Teknik Degisiklikler

### Header.tsx
- Satir 103: `{role !== "admin" && (` → kosulu tamamen kaldir, mesaj ikonu herkese gorunsun

### useUnreadCount.ts
- UPDATE handler: `setUnreadCount(prev => prev - 1)` yerine debounced `fetchUnreadCount()` cagir
- Yeni `conversation_participants` INSERT listener ekle
- Debounce mekanizmasi: 300ms icinde gelen UPDATE'leri birlestir

## Degisecek Dosyalar
1. `src/components/Header.tsx`
2. `src/hooks/useUnreadCount.ts`



Hedef: “Randevularım > Bekleyen” verisini kesin olarak görünür yapmak ve tekrar aynı kör döngüye düşmemek.

1) Kök nedenleri netleştirme (kod + runtime semptomlarına göre)
- `danisan_id` / `customer_is` kaynaklı bir çakışma kodda görünmüyor; sistem genelinde alan adı `customer_id`.
- Asıl kırılgan nokta `appointments` sorgusundaki `profiles` embed/join kısmı:
  - Şu an `profiles!customer_id` / `profiles!teacher_id` kullanılıyor.
  - Projede diğer yerlerde (ve edge function’da) FK adıyla kullanım var: `profiles!appointments_customer_id_fkey`, `profiles!appointments_teacher_id_fkey`.
  - Bu tutarsızlık PostgREST tarafında `PGRST200` benzeri ilişki çözümleme hatası üretip sorguyu düşürüyor; UI hata göstermediği için “Bekleyen yok” gibi görünüyor.
- Daha önceki timestamp `.or()` hatası da doğru şekilde quote edilerek zaten düzeltilmiş; ama tek başına yeterli değil.

2) Kalıcı çözüm tasarımı (tek noktaya bağlı kalmadan)
- Aşama A (hızlı düzeltme):
  - `appointmentQueries.ts` içinde `profiles` embed’lerini FK-adlı forma geri al:
    - `customer:profiles!appointments_customer_id_fkey(username)`
    - `teacher:profiles!appointments_teacher_id_fkey(username)`
- Aşama B (kesin/fail-safe):
  - Embed’li sorgu hata verirse otomatik fallback çalıştır:
    - `appointments` + `listing` verisini joinsiz/az bağımlı çek.
    - Gerekli `customer_id` ve `teacher_id`’lerden `profiles` tablosunu ayrı sorgu ile çekip client-side map et.
  - Böylece FK adı değişse bile randevu listesi görünmeye devam eder.
- Aşama C (gözlemlenebilirlik):
  - `Appointments.tsx` içinde `isError` / `error` durumunu kullanıcıya göster (sessizce “0 kayıt” göstermesin).
  - Dev ortamında `devLog` ile hatayı etiketli logla; kör debugging’i bitir.

3) “customer/danışan” terminoloji güvenliği
- Kod seviyesinde DB alanı `customer_id` kalacak.
- UI metinlerinde “Danışan/Müşteri” serbest kullanılabilir.
- Bu ayrımı netleştirmek için küçük bir yorum/not eklenecek (DB field vs UI label).

4) Doğrulama planı (kesin kapanış için)
- Danışan hesabı ile:
  - `/appointments` aç → network’te `appointments` isteği 200 dönmeli.
  - Bekleyen sekmesinde pending kayıt görünmeli.
- Admin paneli:
  - Aynı payment request “pending” ise danışanda Bekleyen’de görünmeli.
  - Admin onaylayınca status `confirmed`, zamanına göre sekme geçişi doğrulanmalı.
- Hata senaryosu:
  - Join bilerek bozulduğunda fallback devreye girip liste yine gelmeli.
  - UI artık “hata”yı göstermeli, sessiz boş liste olmamalı.

5) Teknik detaylar (uygulama dosyaları)
- `src/lib/queries/appointmentQueries.ts`
  - FK-hint düzeltmesi
  - join-hata fallback akışı
  - mevcut pending mantığı korunacak: `status='pending' OR end_ts >= now`
- `src/pages/Appointments.tsx`
  - `useAppointments` için `isError/error` render
  - boş durum ile hata durumunun ayrıştırılması
- (Opsiyonel) `src/lib/debug.ts` kullanım standardına uygun etiketli loglar

Beklenen sonuç:
- Sorun tek bir FK adına bağımlı olmaktan çıkar.
- “Bekleyen görünmüyor” problemi hem mevcut ortamda çözülür hem de schema/FK adı değişimlerinde tekrar etmez.

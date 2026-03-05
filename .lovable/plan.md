

# Temizlik & Ön Hazırlık — Toplam Plan

## Proje Hedefi
Ödeme sistemi implementasyonundan önce kod tabanını stabilize etmek: rol güvenliği riskini ortadan kaldırmak, ölü kodu temizlemek, product akışını ayrıştırmak, UI tutarlılığını sağlamak ve geçici earnings hesaplamasını düzeltmek.

---

## Değişecek Dosyalar Özeti

| # | Dosya | Değişiklik Türü | Satırlar |
|---|-------|-----------------|----------|
| 1 | `src/pages/admin/Approvals/hooks/useApprovals.ts` | Admin guard ekle (2 fonksiyon) | ~20 satır ekleme |
| 2 | `src/types/database.ts` | 3 ölü type sil | ~20 satır silme |
| 3 | `src/lib/supabase.ts` | Re-export'ları kaldır | ~6 satır silme |
| 4 | `src/pages/ListingDetail/ListingDetailPage.tsx` | Product guard + UI koşulu | ~15 satır değişiklik |
| 5 | `src/lib/queries/appointmentQueries.ts` | Filtre değişikliği (start_ts → end_ts + cancelled filtre) | ~4 satır |
| 6 | `src/pages/Appointments.tsx` | Status badge Türkçe mapping | ~8 satır ekleme |
| 7 | `src/pages/admin/Earnings.tsx` | Geçici fix + banner + nowIso | ~20 satır değişiklik |
| 8 | `src/pages/teacher/Earnings.tsx` | Geçici fix + banner + nowIso | ~15 satır değişiklik |
| 9 | Misc (ListingDetailPage, Appointments) | TODO yorumları | ~2 satır |

**Toplam etki: ~90 satır kod değişikliği/ekleme, hiçbir breaking change yok.**

---

## Detaylı Plan Maddeleri

### (1) ROL GÜVENLİĞİ — `useApprovals.ts` (KRİTİK)

**Problem:** `assignTeacherRole` ve `handleRepair` fonksiyonlarında `DELETE FROM user_roles WHERE user_id = $1` komutu, admin kullanıcının admin rolünü de siler. Admin özellikleri sonrası, yanlış onay veya recovery işlemi sırasında admin panele erişim kaybı riski.

**Çözüm:**
- `assignTeacherRole` fonksiyonunun başında (satır 185 civarı):
  1. `user_roles` tablosundan hedef `userId`'nin admin rolü olup olmadığını kontrol et (simple SELECT)
  2. Admin rolü varsa → Toast hata göster: "Admin kullanıcıya öğretmen rolü atanamaz" ve return (işlem durdur)
  3. Admin değilse → mevcut DELETE + INSERT mantığı çalışır (tek rol korunur)

- `handleRepair` fonksiyonunda (satır 150 civarı) aynı admin guard yapısı: kontrol et, admin ise uyar ve durdur

- **Ek güvenlik katmanı:** DELETE sorgusuna koşul ekle: `DELETE FROM user_roles WHERE user_id = $1 AND role != 'admin'` (admin rolü hiçbir koşulda silinmez)

**Sonuç:** Admin rolü çift koruma ile hiçbir scenario'da silinmez.

---

### (2) ÖLÜ KOD & TİP TEMİZLİĞİ

**`src/types/database.ts`:**
- Satırları sil:
  - `MessageType` (DB: audio_url, read alanları eksik; hiçbir yerde import edilmiyor)
  - `Conversation` (useConversations.ts kendi lokal tipini kullanıyor)
  - `ConversationParticipant` (hiçbir yerde kullanılmıyor)
- Kalan tipleri koru: `Profile`, `UserRole`, `Category`, `ConsultationType`, `Listing`, `ListingPrice`, `Appointment`, `Curiosity`, `Review`

**`src/lib/supabase.ts`:**
- Re-export listesinden (satırlar 34-48) `MessageType`, `Conversation`, `ConversationParticipant` satırlarını kaldır
- Diğer re-export'ları tut

**TypeScript derlemesi:** Build hatasız olmalı, hiçbir dosya bu tipleri bu kaynaklardan import etmiyor.

---

### (3) PRODUCT BOOKING AYRIŞTIRMA — `ListingDetailPage.tsx`

**Problem:** `consultation_type === 'product'` ilanları, randevu booking akışı ile beraber çalışıyor. Ürün satışı `appointments` tablosuna (yanlış model) insert ediliyor.

**Çözüm:**
- `handleBooking` fonksiyonunun başında (satır 59 civarı) guard ekle:
  ```
  if (listing.consultation_type === 'product') {
    toast.error('Ürün satışı yakında aktif olacak');
    return;
  }
  ```
  (Bu, handleBooking'e eklenen herhangi bir insert çağrısını önler.)

- Product kartı rendering (satır 374-462):
  - Satın Al butonunu ve adet seçim UI'ını koşulu ile gizle: `{listing.consultation_type !== 'product' && <button>...}</button>`
  - Placeholder metni ekle: "Ürün satışı yakında aktif olacak. Detaylar için uzmanla mesajlaşın."
  - Mesaj Gönder butonu (zaten var) kalır

**Sonuç:** Product ilanlarında appointment insert edilmez, sadece mesajlaşma kanalı açık kalır.

---

### (4) APPOINTMENTS UI TUTARLILIK — `appointmentQueries.ts` + `Appointments.tsx`

**`appointmentQueries.ts` — Sekme Ayrımı:**
- Mevcut: Bekleyen tab `start_ts >= now`, Tamamlanan tab `start_ts < now` (seans başlamadığı halde tamamlı görüntülenmesi riski)
- Hedef: Bekleyen tab `end_ts >= now AND status != 'cancelled'`, Tamamlanan tab `end_ts < now AND status != 'cancelled'`
  - `end_ts >= now`: Seans hâlâ devam ediyor veya gelecekte
  - `end_ts < now`: Seans geçmiş
  - `status != 'cancelled'`: İptal edilen randevular her iki tabda görünmez (cancel sistemi ileride ele alınacak)

- Kod değişiklikleri:
  - Satır 23: `.gte('start_ts', now)` → `.gte('end_ts', now).neq('status', 'cancelled')`
  - Satır 34: `.lt('start_ts', now)` → `.lt('end_ts', now).neq('status', 'cancelled')`

**`Appointments.tsx` — Status Badge:**
- Satır 96 civarı status badge kodu:
  - Mevcut: `{appointment.status}` (ham değer: "pending", "confirmed", vb.)
  - Hedef: Türkçe mapping ile göster:
    ```
    pending → "Bekliyor"
    confirmed → "Onaylandı"
    cancelled → "İptal Edildi"
    completed → "Tamamlandı"
    ```
  - Badge variant'ı status'e göre renklendirme:
    - pending/confirmed → info/success
    - cancelled → destructive
    - completed → secondary

**Sonuç:** Sekmeler mantıksal olarak tutarlı, cancelled randevular görünmez, status Türkçe ve renkli.

---

### (5) COMPLETED GEÇİCİ FIX — `admin/Earnings.tsx` + `teacher/Earnings.tsx`

**Problem:** Ödeme sistemi olmadığı için hiçbir appointment `status = 'completed'` durumuna geçmiyor. Earnings raporları hep 0 gösteriyor.

**Çözüm (geçici, ödeme sistemi gelince yenilecek):**
- Her sayfanın başında (useEffect veya render başında) `nowIso` değişkeni oluştur:
  ```
  const nowIso = new Date().toISOString();
  ```
  (Tüm query'lerde tutarlı zaman kullanılması için)

- **`admin/Earnings.tsx`:**
  - Satır 114: `.eq("status", "completed")` → `.eq("status", "confirmed").lt("end_ts", nowIso)`
  - Satır 133: Aynı değişiklik (pending payout için)
  - Satır 216: Trend grafiği — aynı filtre
  - Sayfanın üstüne uyarı banner: "⚠️ Geçici hesaplama: Ödeme sistemi gelince güncellenecek."

- **`teacher/Earnings.tsx`:**
  - Satır 59 civarı: `.eq("status", "completed")` → `.eq("status", "confirmed").lt("end_ts", nowIso)`
  - Aynı uyarı banner

**Sonuç:** Earnings raporları geçici olarak çalışır (confirmed + geçmiş seanslar bazında). Ödeme sistemi gelince bu kod yenilecek.

---

### (6) EDGE FUNCTIONS — TODO Yorumları

**`ListingDetailPage.tsx`:**
- Satır 109 (`send-appointment-email` invoke) üstüne TODO: 
  ```
  // TODO: Ödeme sistemi gelince bu invoke noktası değişecek — appointment artık ödeme sonrası oluşacak
  ```

**`Appointments.tsx`:**
- Satır 49 civarı (`send-status-update-email` invoke) üstüne TODO:
  ```
  // TODO: Ödeme sistemi gelince bu invoke admin paneline taşınacak (uzman değil admin onaylayacak)
  ```

**Sonuç:** Geliştiriciye bilgi, kod değişikliği yok.

---

## Uygulama Sırası (Risk Düşükten Yükseğe)

```
1. Ölü Kod Temizliği (database.ts + supabase.ts)
   → Bağımlılık sıfır, güvenli

2. Product Booking Guard (ListingDetailPage.tsx)
   → Küçük değişiklik, isolated

3. Appointments UI Tutarlılığı (appointmentQueries.ts + Appointments.tsx)
   → UI logic değişikliği, bağımlılık az

4. Earnings Geçici Fix (admin/Earnings.tsx + teacher/Earnings.tsx)
   → Query değişikliği, düşük risk

5. Role Güvenliği (useApprovals.ts) — EN SON
   → Kritik, tüm önlemler aldıktan sonra apply et
```

---

## Doğrulama & Test Noktaları

- **TS compile:** `npm run build` hatasız çalışmalı
- **Dead code:** `useConversations.ts`, `useMessages.ts` hatasız import çalışmalı
- **Appointments:** 
  - Bekleyen tab'da cancelled randevular görünmemeli
  - Sekmeler end_ts'ye göre ayrılmalı
  - Status badge'ler Türkçe ve renkli
- **Earnings:** 
  - Admin/Teacher earnings > 0 göstermeli (confirmed + end_ts < now)
  - Uyarı banner visible
- **Product:** Product ilanında randevu booking UI gizli, toast çıkmazsa button click'lenseydi dönerdi

---

## Sonraki Adımlar (Ödeme Sistemi Sonrası)

- Earnings fix kodunu ödeme/ledger tablolarına geçir
- Completed status'ü otomatik set eden cron/trigger ekle
- send-status-update-email invoke'unu admin paneline taşı
- Product satışlarını order tablosuna ve ayrı flow'a taşı


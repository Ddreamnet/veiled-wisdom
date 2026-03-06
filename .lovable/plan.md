
Teşhisi katman katman yaptım. Kod akışı + mevcut network/console snapshot + dosya incelemesi sonucu aşağıdaki net tablo çıkıyor.

## 1) GERÇEK VERİ AKIŞI (Uçtan uca)

### A. Nerede tetikleniyor?
- `src/pages/ListingDetail/ListingDetailPage.tsx`
  - `handleBooking()` içinde `/payment/method`’a state ile gidiliyor.
  - `startTs` / `endTs` burada üretiliyor:
    - `startTs = new Date(\`${format(selectedDate,"yyyy-MM-dd")}T${selectedTime}\`)`
    - `endTs = startTs + duration`
- `src/pages/Payment/PaymentMethodPage.tsx`
  - State’i alıp `/payment/bank-transfer`’a aynen taşıyor.
- `src/pages/Payment/BankTransferScreen.tsx`
  - `handleConfirmPayment()` içinde RPC çağrısı var:
  - `supabase.rpc("create_payment_request_and_appointment", {...})`

### B. RPC adı ve payload alanları
`create_payment_request_and_appointment` çağrısına gönderilen alanlar:
- `_customer_id: user.id`
- `_teacher_id: flowState.teacherId`
- `_listing_id: flowState.listingId`
- `_listing_price_id: flowState.priceId`
- `_item_type: flowState.consultationType === "product" ? "product" : "appointment"`
- `_quantity`
- `_amount`
- `_bank_account_id`
- `_start_ts`
- `_end_ts`
- `_duration_minutes`
- `_reference_code`

### C. Başarılı çağrı sonrası
- Toast gösteriliyor (`Ödeme Bildirimi Gönderildi`, `reference_code` kullanılıyor)
- Sonra `navigate("/appointments", { replace: true })`

### D. Beklenen DB yazımı
- Her durumda: `payment_requests` satırı `status='pending'`
- `_item_type='appointment'` ve `_start_ts != null` ise:
  - `appointments` satırı da oluşturulmalı
  - `status='pending'`
  - `payment_request_id` dolu olmalı

---

## 2) RPC / SQL FUNCTION KONTROLÜ

Repo’da function’ın canlı DB sürümünü doğrudan okuyamıyorum; fakat manuel migration dokümanındaki son sürüm (`phase3_reference_code.md`) şu imzayı gösteriyor:

`create_payment_request_and_appointment(_customer_id,_teacher_id,_listing_id,_listing_price_id,_bank_account_id,_item_type,_quantity,_amount,_start_ts,_end_ts,_duration_minutes,_reference_code) returns jsonb`

Function mantığı (dokümandaki son sürüm):
- auth check: `auth.uid() == _customer_id`
- listing/price/banka validasyonları
- `payment_requests` insert (`status='pending'`)
- `if _item_type='appointment' and _start_ts is not null`:
  - `appointments` insert (`status='pending'`, `payment_request_id` set)
- JSON döner: `payment_request_id`, `appointment_id`, `reference_code`

Sonuç: Kodun RPC çağrı şekli ile bu imza uyumlu; appointment insert mantığı da var.

---

## 3) DB’de gerçekten oluşuyor mu? (Mevcut kanıt seviyesi)

Doğrudan DB SELECT çalıştırma imkânı bu oturumda yok; bu yüzden canlı tabloda “son 1-2 kayıt”ı doğrudan okuyamıyorum.
Ama mevcut frontend akışı açısından:
- RPC hata olursa catch’e düşüyor ve `/appointments`’a navigate edilmiyor.
- Siz akışın devam ettiğini söylüyorsunuz; bu da çoğu senaryoda payment_request insert’in başarılı olduğuna işaret eder.

Önemli: “oluşuyor ama görünmüyor” ile “oluşmuyor”u kesin ayırmak için canlı DB doğrulaması şart (aşağıda minimum SQL kontrolünü veriyorum).

---

## 4) RLS / POLICY KONTROLÜ

Kod tarafında `appointments` SELECT tamamen client query’ye bağlı; yani RPC SECURITY DEFINER insert etse bile görüntüleme SELECT’te RLS’e takılabilir.

Ancak siz policy SQL’lerini çalıştırdığınızı belirttiniz.
Bu durumda iki olasılık kalıyor:
1) Policy doğru ama kayıt `customer_id/end_ts` yüzünden query’ye düşmüyor
2) Policy doğru değil/çakışıyor ve query error veriyor, fakat UI bunu sessizce yutuyor

Kritik gözlem:
- `useAppointments` içinde `pendingResult.error` / `completedResult.error` hiç loglanmıyor.
- Hata olsa bile `data || []` ile boş listeye düşüyor.
- Bu, RLS/ilişki hatasını UI’da “boş bekleyen” gibi gösterebilir.

---

## 5) QUERY / FETCH KONTROLÜ (Gerçek hali)

Dosya: `src/lib/queries/appointmentQueries.ts`

### Customer tarafı (role !== 'teacher')
- `column = 'customer_id'`
- Pending query:
  - `.eq('customer_id', userId)`
  - `.gte('end_ts', now)`
  - customer için status filtresi yok (pending/confirmed/cancelled gelebilir)
- Completed query:
  - `.eq('customer_id', userId)`
  - `.lt('end_ts', now)`
  - `.neq('status','cancelled')`

### Teacher tarafı (role === 'teacher')
- `column = 'teacher_id'`
- Pending query:
  - `.eq('teacher_id', userId)`
  - `.gte('end_ts', now)`
  - `.neq('status','cancelled')`
- Completed query:
  - `.lt('end_ts', now)`
  - `.neq('status','cancelled')`

Pending’i customer tarafında eleyen kritik koşul:
- **`end_ts >= now`**
- Yani status `pending` olsa bile `end_ts` geçmişteyse “Bekleyen”e düşmez.

---

## 6) Sekme / UI filtresi

Dosya: `src/pages/Appointments.tsx`
- “Bekleyen” sekmesi doğrudan `pending` array’ini render ediyor.
- Ek bir client-side status elemesi yok.
- `pending` status label’ı mevcut: “Ödeme Kontrol Ediliyor”
- `cancelled + customer` için “Reddedildi” label’ı var.
- Yani UI render tarafında pending’i ayrıca filtreleyen bir koşul görünmüyor.

Sonuç: Kayıt `pending` array’ine geliyorsa ekranda görünür; gelmiyorsa sorun query/rol/zaman/RLS katmanında.

---

## 7) ROLE / AUTH CONTEXT KONTROLÜ

- Role kaynağı: `AuthContext` → `fetchUserRoleFromDB()`
- Öncelik: `admin > teacher > customer` (`src/contexts/auth/roleHelpers.ts`)
- `useAppointments(user?.id, role)` role’a göre kolon seçiyor.

Kritik yan etki:
- Kullanıcının rolü `teacher` ise query `teacher_id` kolonundan çalışır.
- Aynı kullanıcı müşteri gibi ödeme yaptıysa (customer_id=user.id, teacher_id başka biri), bu kayıt teacher branch’te görünmez.
- Yani multi-role/hatalı rol tespiti durumunda yanlış branch’e girip “kayıt yok” görülebilir.

---

## 8) TIME / STATUS MANTIĞI

En kritik teknik nokta:
- `ListingDetailPage` saat seçiminde bugün için geçmiş saatleri de seçtiriyor (00:00–23:00 tam liste).
- Seçilen saat geçmişteyse:
  - appointment `pending` olarak yaratılsa bile `end_ts < now` olur
  - bu yüzden “Bekleyen” değil “Tamamlanan” query’sine düşer.

Bu senaryo kodla birebir uyumlu ve sık yaşanabilir.

---

## 9) Legacy / Yeni akış çakışması

- Yeni akış: payment_request + appointment (`payment_request_id` dolu)
- Legacy akış referansı daha çok earnings tarafında var (`payment_request_id is null` kontrolleri)
- `Appointments` sayfası legacy/new ayrımı yapmıyor; doğrudan `appointments` tablosundan okuyor.
- Bu yüzden ana problem burada “legacy/new source split” değil; daha çok `end_ts` filtresi / rol branch / sessiz query error.

---

## 10) SONUÇ — KÖK NEDEN RAPORU (İstenen format)

### A) Sorun DB’de mi UI’da mı RLS’de mi?
- **Birincil olarak Query/Zaman katmanında.**
- İkincil olarak RLS veya query error’un UI’da sessiz yutulması ihtimali var.

### B) Pending appointment gerçekten oluşuyor mu?
- Kod akışı ve RPC tasarımına göre **oluşması bekleniyor**.
- Canlı DB’den doğrudan satır okuyamadığım için bu oturumda %100 doğrulayamıyorum.
- Ama oluşsa bile `end_ts` yüzünden bekleyende görünmemesi teknik olarak mümkün ve kodla uyumlu.

### C) Danışan neden göremiyor?
En olası iki teknik sebep:
1. **`end_ts >= now` filtresi** (seçilen saat geçmişte/çok yakın geçmişte kalıyor)
2. **Role branch sapması** (kullanıcı `teacher/admin` role ile yanlış kolondan sorgulanıyor)
+ Olası ek: query error varsa boş array’e düşmesi (sessiz).

### D) Hangi dosya/query/policy/state sorumlu?
- `src/lib/queries/appointmentQueries.ts` → `gte('end_ts', now)` + role bazlı `column`
- `src/pages/ListingDetail/ListingDetailPage.tsx` → geçmiş saat seçimine izin verilmesi
- `src/contexts/auth/roleHelpers.ts` → role priority (`admin > teacher > customer`)
- `src/pages/Appointments.tsx` → query error görünür kılınmıyor (dolaylı)

### E) En olası 1 ana kök neden
- **Zaman filtresi çakışması:** pending status olsa da `end_ts < now` olduğu için kayıt “Bekleyen” query’sinden eleniyor.

### F) İkinci derecede katkı yapan problemler
- Query errors’ın sessiz yutulması (`pendingResult.error` kontrol/log yok)
- Multi-role kullanıcıda yanlış role branch seçimi
- Yeni ödeme sonrası appointments query cache invalidation eksikliği (kısa süreli “görünmüyor” hissi yaratabilir)

### G) Minimum değişiklikle çözüm önerisi
(Şimdilik teşhis modunda, patch değil)
1. **Tanısal küçük fix**: `useAppointments` içine `pendingResult.error/completedResult.error` log + throw ekle (sessiz boş listeyi bitirir).
2. **Tanısal DB kontrolü** (tek sorgu seti):
   - Son payment_request + bağlı appointment + customer_id/end_ts doğrulaması.
3. **Fonksiyonel küçük fix adayı**:
   - ListingDetail’de bugün için geçmiş saatleri disable et.
4. **Opsiyonel UX güvence**:
   - Bank transfer sonrası `queryClient.invalidateQueries({queryKey:['appointments']})`.

### H) Gerekirse patch uygulanacak dosyalar listesi
- `src/lib/queries/appointmentQueries.ts` (error handling + gerekirse fetch mantığı)
- `src/pages/ListingDetail/ListingDetailPage.tsx` (geçmiş saat disable)
- `src/pages/Payment/BankTransferScreen.tsx` (appointments invalidate)

---

## Somut doğrulama için (gerçek örnek çıkarmak adına) önerdiğim tek seferlik SQL kontrolü

Aşağıdaki sorgularla “oluşuyor mu / neden görünmüyor” 2 dakikada kesinleşir:

```sql
-- 1) Son 5 appointment payment_request eşleşmesi
select
  a.id as appointment_id,
  a.status as appointment_status,
  a.customer_id,
  a.teacher_id,
  a.start_ts,
  a.end_ts,
  a.payment_request_id,
  pr.id as pr_id,
  pr.status as pr_status,
  pr.reference_code,
  pr.item_type,
  pr.created_at as pr_created_at
from public.appointments a
left join public.payment_requests pr on pr.id = a.payment_request_id
order by a.created_at desc
limit 5;

-- 2) Belirli danışan için pending ama geçmişe düşmüş mü?
-- <CUSTOMER_UUID> yerine test danışan id
select id, status, start_ts, end_ts, now() as db_now
from public.appointments
where customer_id = '<CUSTOMER_UUID>'
order by created_at desc
limit 20;
```

Beklediğim teşhis paterni:
- status = pending ama end_ts < now ise kayıt DB’de vardır, Bekleyen’de görünmez.

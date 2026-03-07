
Hedefinize göre bu sefer “kesin çözüm” için yalnızca semptom değil, veri bütünlüğünü kökten kilitleyen bir plan uygulayacağım. Mevcut bulgulara göre ana problem tek bir katmanda değil; **payment_requests ↔ appointments senkronu kırılmış**.

1) Kesin teşhis (eldeki veriye göre)
- Admin’de payment_request’ler `rejected` olurken, appointments tarafında hâlâ `pending` kalabilen kayıtlar var (senin verdiğin sayı: toplam 8, pending 6, cancelled 2).
- `src/pages/admin/Payments.tsx` içinde reject/approve sırasında appointments update çağrısında:
  - result/error kontrolü yapılmıyor,
  - `.select()` yok, etkilenen satır sayısı doğrulanmıyor.
- Network’te appointments PATCH `204` dönüyor; bu “başarılı güncellendi” garantisi değil (0 row update de olabilir).
- Bu yüzden payment_requests ve appointments durumları ayrışıyor; SQL’de pending şişmesi buradan geliyor.
- Danışan `/appointments` ekranı sadece `appointments` tablosunu okuduğu için, payment_request doğru olsa bile appointments tarafı bozuksa görünürlük bozuluyor.

2) Uygulanacak çözüm mimarisi (kalıcı)
A) DB tarafını tek kaynak gerçeklik haline getir
- `payment_requests.status` değiştiğinde bağlı `appointments.status` otomatik güncellensin (DB trigger).
- Uygulama koduna güvenmek yerine DB’de zorunlu senkron.

B) Veri onarımı (one-time backfill)
- Mevcut bozuk kayıtları toplu senkronla:
  - `payment_requests.rejected` -> `appointments.cancelled`
  - `payment_requests.confirmed` -> `appointments.confirmed`
  - `payment_requests.pending` -> `appointments.pending`
- Bu adım senin “şu an pending 6 neden var?” sorununu temizler.

C) Uygulama katmanını sessiz hataya kapat
- Admin reject/approve akışında appointments update sonucu zorunlu kontrol:
  - error varsa throw,
  - updated row count 0 ise uyarı + log + işlemi başarısız say.
- Böylece bir daha “görünürde reddedildi ama appointment pending kaldı” olmayacak.

3) Uygulanacak dosya/SQL değişiklik planı
- `src/pages/admin/Payments.tsx`
  - `handleReject` ve `handleApprove` içinde appointments update sonucunu `select()` ile doğrulama.
  - başarısız senkron durumunda toast + abort.
- (Yeni migration SQL)
  - status sync trigger function (`payment_requests` -> `appointments`)
  - one-time data reconciliation script

4) Önce çalıştırılacak kesin doğrulama SQL (teşhis)
```sql
-- A) Senkron bozukluk özeti
select
  pr.status as pr_status,
  a.status  as appt_status,
  count(*)  as cnt
from public.payment_requests pr
left join public.appointments a
  on a.payment_request_id = pr.id
where pr.item_type = 'appointment'
group by pr.status, a.status
order by pr.status, a.status;

-- B) payment_request rejected ama appointment cancelled olmayanlar
select
  pr.id as pr_id,
  pr.reference_code,
  pr.status as pr_status,
  a.id as appt_id,
  a.status as appt_status
from public.payment_requests pr
left join public.appointments a on a.payment_request_id = pr.id
where pr.item_type = 'appointment'
  and pr.status = 'rejected'
  and (a.id is null or a.status <> 'cancelled')
order by pr.created_at desc;
```

5) One-time düzeltme SQL (pending 6’yı temizleyen adım)
```sql
begin;

update public.appointments a
set status = case
  when pr.status = 'rejected' then 'cancelled'
  when pr.status = 'confirmed' then 'confirmed'
  else 'pending'
end
from public.payment_requests pr
where a.payment_request_id = pr.id
  and pr.item_type = 'appointment'
  and a.status is distinct from case
    when pr.status = 'rejected' then 'cancelled'
    when pr.status = 'confirmed' then 'confirmed'
    else 'pending'
  end;

commit;
```

6) Kalıcı DB trigger planı (tekrar bozulmaması için)
- `payment_requests` üzerinde `AFTER UPDATE OF status` trigger:
  - sadece `item_type='appointment'` için çalışacak,
  - bağlı appointment status’u map’leyecek (`rejected -> cancelled`, `confirmed -> confirmed`, `pending -> pending`).

7) Danışan görünürlük sorunu için kesinleştirme adımı
- DB senkronu düzeltildikten sonra `/appointments` ekranı yeniden test:
  - yeni ödeme oluştur,
  - admin onaylamadan önce danışanda “Bekleyen”de görünmeli,
  - admin reddedince status “Reddedildi” olarak kalmalı (ve artık yanlış pending sayısı olmamalı).
- Eğer hâlâ görünmüyorsa ikinci katman patch:
  - `useAppointments` içinde customer branch’e debug audit (query result + role + userId),
  - role branch sapması varsa (teacher/customer) bunu ayrı net patch ile sabitleyeceğim.

8) Beklenen nihai sonuç
- SQL tarafında pending_count, admin işlemleriyle tutarlı olacak (hepsi reddedildiyse pending 0).
- Danışan bekleyen sekmesi, admin onayı bekleyen yeni randevuları deterministik şekilde gösterecek.
- Admin reddettiğinde appointment status’unun pending’de kalması kalıcı olarak bitecek.

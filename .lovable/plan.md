

# Randevu Görünürlüğü Sorunu — Kök Neden Analizi

## Bulgular

Kod tarafı doğru çalışıyor:
- RPC (`create_payment_request_and_appointment`) `SECURITY DEFINER` ile `pending` statüsünde appointment oluşturuyor
- `appointmentQueries.ts` doğru filtreleme yapıyor (`customer_id` / `teacher_id` + `end_ts >= now`)
- Network verilerinde payment_request'lerin `start_ts` ve `end_ts` değerleri dolu → RPC'deki `IF _item_type = 'appointment' AND _start_ts IS NOT NULL` koşulu sağlanıyor

## Olası Kök Nedenler (DB Tarafı)

1. **Mevcut çakışan SELECT policy'ler**: `appointments` tablosunda önceden oluşturulmuş restrictive policy'ler olabilir. `CREATE POLICY` aynı isimde policy varsa hata verir ve sessizce atlanabilir.

2. **Admin UPDATE policy eksik**: Admin reddettiğinde `appointments` tablosunu güncelliyor (`PATCH .../appointments?payment_request_id=eq.X`). UPDATE policy yoksa bu güncelleme sessizce 0 satır etkiler (204 döner ama satır güncellenmez).

## Çözüm

Aşağıdaki SQL'i **Supabase SQL Editor'da** çalıştırmanız gerekiyor. Bu SQL mevcut tüm policy'leri temizleyip yeniden oluşturur:

```sql
-- 1. Mevcut tüm appointments policy'lerini temizle
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'appointments' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', pol.policyname);
  END LOOP;
END $$;

-- 2. RLS'in aktif olduğundan emin ol
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy'leri
CREATE POLICY "Customer can read own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Teacher can read own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Admin can read all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. UPDATE policy (admin onay/red için gerekli)
CREATE POLICY "Admin can update all appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Schema cache'i yenile
NOTIFY pgrst, 'reload schema';
```

## Neden Önceki SQL Çalışmamış Olabilir

- Mevcut policy'ler `DROP POLICY IF EXISTS` ile silinmeden `CREATE POLICY` çalıştırılmışsa, aynı isimde policy hatası alınmış ve SQL durmuş olabilir
- Ya da appointments tablosunda RLS aktif değildi ve `ENABLE ROW LEVEL SECURITY` hiç çalıştırılmamıştı (bu durumda policy'ler oluşsa bile etkisizdir)

Yukarıdaki SQL tüm senaryoları kapsar: önce mevcut policy'leri temizler, RLS'i aktif eder, sonra doğru policy'leri oluşturur.

## Kod Değişikliği

Kod tarafında değişiklik gerekmiyor. Sorun tamamen veritabanı RLS policy'lerinde.


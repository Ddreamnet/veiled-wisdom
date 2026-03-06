

# Randevu Görünürlüğü ve Mobil Buton Düzeltmesi

## Sorun 1: Randevular Görünmüyor — Kök Neden Analizi

Query mantığı (`appointmentQueries.ts`) doğru çalışıyor — `pending` statülü randevuları hem danışan hem uzman için getirmesi gerekiyor. RPC (`create_payment_request_and_appointment`) da doğru şekilde `pending` statüsünde appointment oluşturuyor.

**Kök neden: `appointments` tablosundaki RLS (Row Level Security) politikaları.**

Projede `appointments` tablosunun oluşturulması migration dosyalarında yer almıyor (önceden oluşturulmuş). Bu tabloda muhtemelen:
- Teacher için SELECT policy var (`teacher_id = auth.uid()`)
- Customer için SELECT policy eksik veya kısıtlı

SECURITY DEFINER fonksiyon RLS'i bypass ederek kayıt oluşturuyor, ama client-side okuma RLS'e tabi. Customer ve teacher bu yüzden kendi randevularını göremiyorlar.

**Çözüm — Supabase SQL Editor'da çalıştırılacak SQL:**
```sql
-- Customer kendi randevularını görebilsin
CREATE POLICY "Customer can read own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- Teacher kendi randevularını görebilsin
CREATE POLICY "Teacher can read own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- Admin tüm randevuları görebilsin
CREATE POLICY "Admin can read all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

Bu SQL'i kullanıcının Supabase SQL Editor'dan çalıştırması gerekecek. Eğer mevcut politikalar varsa `CREATE POLICY` hata verebilir — bu durumda önce `DROP POLICY IF EXISTS` ile mevcut politikalar kaldırılmalı.

## Sorun 2: Mobil "Ödemeyi Yaptım" Butonu Navbar ile Çakışma

`BankTransferScreen.tsx` satır 216'da buton `fixed bottom-0` ile konumlandırılmış. Mobilde `MobileBottomNav` da aynı yerde, dolayısıyla üst üste biniyorlar.

**Çözüm:**
- `bottom-0` yerine `bottom-[calc(80px+env(safe-area-inset-bottom,0px))]` veya Tailwind ile `bottom-20` kullanarak butonun nav bar'ın üstüne oturmasını sağla
- Spacer yüksekliğini de buna göre ayarla (`h-24` → `h-44` veya uygun değer)

### Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `BankTransferScreen.tsx` | Sticky CTA'nın bottom offset'ini mobilde nav bar yüksekliğini hesaba katacak şekilde ayarla |

**Not:** RLS değişikliği kod tarafında yapılamaz, kullanıcıya Supabase SQL Editor'da çalıştırması gereken SQL verilecektir.


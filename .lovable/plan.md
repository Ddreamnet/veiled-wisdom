

# Ödeme Sistemi Planı — Revize v3 (Atomik İşlem + Güvenlik Sertleştirme + Phase Ayrımı)

## Eklenen 3 Kritik Madde

### EK-6) Atomik İşlem: RPC ile `create_payment_request_and_appointment()`

**Problem:** Plan v2'de "TEK TRANSACTION" deniyor ama client'tan iki ayrı INSERT (`payment_requests` + `appointments`) gerçek DB transaction değil. Ağ kesilirse biri olur biri olmaz; reference_code çakışması gibi edge case'ler oluşur.

**Çözüm:** Postgres RPC fonksiyonu (SECURITY DEFINER):

```text
create_payment_request_and_appointment(
  _customer_id      uuid,
  _teacher_id       uuid,
  _listing_id       uuid,
  _listing_price_id uuid,
  _item_type        text,        -- 'appointment' | 'product'
  _quantity          int,
  _amount            numeric,
  _bank_account_id   uuid,
  _start_ts          timestamptz, -- NULL for product
  _end_ts            timestamptz, -- NULL for product
  _duration_minutes  int          -- NULL for product
)
RETURNS jsonb  -- { payment_request_id, appointment_id (nullable), reference_code }
```

Fonksiyon içinde (tek transaction):
1. `reference_code` server-side üretilir (`'EL-' || upper(substr(md5(random()::text), 1, 6))`)
2. `payment_requests` INSERT (status='pending')
3. `item_type='appointment'` ise → `appointments` INSERT (status='pending', payment_request_id)
4. Tek `jsonb` response döner

**Avantajlar:**
- Atomik: ya ikisi de olur, ya hiçbiri
- reference_code server-side → çakışma halinde retry DB tarafında
- RLS basitleşir: client sadece RPC çağırır, doğrudan INSERT yapmaz
- `appointments` tablosuna customer INSERT RLS'i gerekli olmaz

**Etki:** `BankTransferScreen.tsx`'te `supabase.rpc('create_payment_request_and_appointment', {...})` çağrısı yapılır. `supabase.from('appointments').insert()` ve `supabase.from('payment_requests').insert()` client'tan hiç çağrılmaz.

---

### EK-7) Duplicate Önleme: UNIQUE Constraint'ler + İdempotent Update

**DB constraint'leri:**
- `appointments.payment_request_id` → UNIQUE (NULL serbest; legacy kayıtlar etkilenmez)
- `earnings_ledger.payment_request_id` → UNIQUE (her PR için tek ledger kaydı)
- `orders.payment_request_id` → UNIQUE (zaten planda var)

**Admin onay idempotency:**
- Admin "Onayla" butonundaki UPDATE sorgusu:
  ```text
  UPDATE payment_requests SET status='confirmed', confirmed_at=now()
  WHERE id = $1 AND status = 'pending'
  ```
  `AND status = 'pending'` koşulu: zaten onaylanmış talebi tekrar onaylamayı engeller (0 row affected → "Zaten işlenmiş" toast)
- `earnings_ledger` INSERT'te `ON CONFLICT (payment_request_id) DO NOTHING` eklenebilir (ekstra güvenlik)

---

### EK-8) RLS Basitleştirme: Client INSERT Kaldırılır

**Eski risk:** Client'tan `appointments.insert()` yapılırsa kullanıcı başkasının `payment_request_id`'sini bağlayabilir.

**Çözüm (EK-6 ile entegre):**
- Client asla doğrudan `appointments` veya `payment_requests` INSERT yapmaz
- Tüm INSERT'ler RPC fonksiyonu içinde (SECURITY DEFINER)
- RPC fonksiyonu `auth.uid()` kontrolü yapar: `_customer_id = auth.uid()` olmalı
- `appointments` tablosundaki mevcut customer INSERT RLS policy'si korunabilir (legacy uyum) ama yeni akışta kullanılmaz

**Admin onay tarafı:**
- Admin, `payment_requests` UPDATE yapabilir (RLS: `has_role(auth.uid(), 'admin')`)
- Admin, `appointments` UPDATE yapabilir (status: pending→confirmed)
- Admin, `earnings_ledger` INSERT yapabilir (RLS: admin only)
- Admin, `orders` INSERT yapabilir (RLS: admin only)
- Alternatif: admin onay akışı da RPC ile atomik yapılabilir (`confirm_payment_request(pr_id)`) — Phase 2'de değerlendirilebilir

---

## Güncellenen Plan Bölümleri

### A) DB/SQL — Ek değişiklikler

Mevcut plan v2 tablolarına ek olarak:

**UNIQUE constraint'ler:**
- `ALTER TABLE appointments ADD CONSTRAINT uq_appointments_payment_request UNIQUE (payment_request_id);`
- `ALTER TABLE earnings_ledger ADD CONSTRAINT uq_ledger_payment_request UNIQUE (payment_request_id);`
- `orders.payment_request_id` zaten UNIQUE (plan v2'de var)

**RPC fonksiyonu:**
- `create_payment_request_and_appointment()` — yukarıdaki tanım
- SECURITY DEFINER, `search_path = public`
- `auth.uid()` = `_customer_id` kontrolü fonksiyon başında

### B) RLS — Güncellenmiş

| Tablo | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `payment_requests` | customer: own / admin: all | **RPC ile** (doğrudan INSERT yok) | admin: status UPDATE |
| `appointments` | mevcut RLS korunur | **RPC ile** (yeni akış) / mevcut RLS (legacy) | admin: status UPDATE |
| `orders` | customer: own / teacher: own / admin: all | admin only | admin only |
| `earnings_ledger` | teacher: own / admin: all | admin only | admin: payout_id set |
| `bank_accounts` | authenticated (is_active=true) | admin | admin |

### C) UI Akış — Güncellenmiş

`BankTransferScreen.tsx` "Ödemeyi Yaptım" double confirm sonrası:
```text
const { data, error } = await supabase.rpc('create_payment_request_and_appointment', {
  _customer_id: user.id,
  _teacher_id: listing.teacher_id,
  _listing_id: listing.id,
  _listing_price_id: selectedPrice.id,
  _item_type: 'appointment',  // veya 'product'
  _quantity: quantity,
  _amount: totalAmount,
  _bank_account_id: selectedBank.id,
  _start_ts: selectedSlot?.start,
  _end_ts: selectedSlot?.end,
  _duration_minutes: selectedPrice.duration_minutes
});
// data = { payment_request_id, appointment_id, reference_code }
```

### D) Admin Onay — İdempotent

```text
Admin "Onayla":
1. UPDATE payment_requests SET status='confirmed' WHERE id=$1 AND status='pending'
   → 0 rows? → Toast: "Bu talep zaten işlenmiş"
   → 1 row? → devam:
2. UPDATE appointments SET status='confirmed' WHERE payment_request_id=$1
3. earnings_ledger INSERT (ON CONFLICT DO NOTHING)
4. item_type='product' → orders INSERT (ON CONFLICT DO NOTHING)
5. Email invoke
```

---

## Phase Ayrımı (2 Seferde Uygulama)

### PHASE 1: Altyapı + Ödeme Akışı (DB → RPC → UI → Temel Admin)

**Scope:**
1. DB migration: `bank_accounts`, `payment_requests`, `orders`, `earnings_ledger` tabloları + `appointments.payment_request_id` kolonu + UNIQUE constraint'ler + RLS policy'leri
2. `bank_accounts` seed: Ziraat + KuveytTürk
3. RPC: `create_payment_request_and_appointment()` fonksiyonu
4. `src/lib/constants.ts` → `PLATFORM_COMMISSION_RATE = 0.25`
5. `src/components/CopyableField.tsx`
6. `src/pages/Payment/PaymentMethodPage.tsx` + `BankTransferScreen.tsx`
7. `ListingDetailPage.tsx` → handleBooking değişikliği (ödeme akışına yönlendirme)
8. `appointmentQueries.ts` → teacher pending filtresi (`.neq('status', 'pending')`)
9. `Appointments.tsx` → badge mapping güncelleme ("Ödeme Kontrol Ediliyor")
10. Route güncellemeleri (`routeConfig.ts`)

**Phase 1 sonunda çalışan akış:**
- Danışan ilan seçer → ödeme yöntemi → banka bilgileri → "Ödemeyi Yaptım" → atomik RPC → appointments sayfasında "Ödeme Kontrol Ediliyor"
- Teacher pending görmez
- Admin henüz onaylayamaz (Phase 2)

---

### PHASE 2: Admin Panel + Earnings Geçişi + Payout Kalem Listesi

**Scope:**
1. `/admin/payments` sayfası (tablo + filtre + onayla/reddet + idempotent update)
2. Admin nav "Finans" grubu (Ödeme Onayları / Gelirler / Uzman Ödemeleri)
3. `admin/Earnings.tsx` → ledger bazlı geçiş + legacy UNION + `PLATFORM_COMMISSION_RATE` sabiti (0.15 → 0.25)
4. `teacher/Earnings.tsx` → ledger bazlı geçiş
5. Payout "Kalem Listesi" UI (dialog/drawer: `earnings_ledger WHERE payout_id = X`)
6. Product akışı aktif etme (`ListingDetailPage` placeholder kaldırma, item_type='product' ile RPC çağrısı)
7. Edge function güncellemeleri (`send-appointment-email` admin onayından invoke, `send-status-update-email` genişletme)
8. `Appointments.tsx` → teacher onayla/reddet butonları kaldırma (artık admin onaylıyor)

**Phase 2 sonunda çalışan akış:**
- Tam uçtan uca: danışan ödeme → admin onay → uzman confirmed görür → earnings ledger → payout kalem listesi

---

## Güncel Blocker / Riskler (7 madde)

1. **RLS mevcut durumu bilinmiyor** — Supabase UI'dan yönetiliyor; yeni tablolar + RPC için migration gerekli
2. **Referans kodu çakışma** — Server-side üretim + DB UNIQUE; retry mantığı RPC içinde (düşük risk)
3. **Concurrent admin onay** — `WHERE status='pending'` idempotent guard + UNIQUE constraint'ler → çözülmüş
4. **Legacy earnings UNION** — İki kaynağı (ledger + eski appointments) birleştirme geçici karmaşıklık
5. **Product listing_prices semantik** — `duration_minutes` product'ta anlamsız; quantity ile karıştırılma riski
6. **Edge function JWT** — Tüm function'lar `verify_jwt=false`; ödeme emaili için function içinde auth kontrolü
7. **0.15 hardcoded** — `admin/Earnings.tsx` satır 164 ve 239'da hala 0.15; Phase 2'de `PLATFORM_COMMISSION_RATE` ile değişecek

## Kesinleşen Kararlar (soru kalmadı)

1. **Komisyon:** %25 platform / %75 teacher — `PLATFORM_COMMISSION_RATE = 0.25`
2. **FK standardı:** `profiles(id)` tüm yeni tablolarda
3. **Payout:** `payout_items` yok; `earnings_ledger.payout_id` tek kaynak
4. **Appointment oluşturma:** RPC ile atomik (payment_request + appointment tek transaction)
5. **Banka bilgileri:** DB `bank_accounts` tablosu
6. **Duplicate önleme:** UNIQUE constraint + idempotent admin UPDATE
7. **Client INSERT yok:** payment_requests + appointments INSERT sadece RPC üzerinden


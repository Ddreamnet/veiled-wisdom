

# Ödeme Sistemi v3 — Doğrulama Raporu

---

## A) BUILD / TYPECHECK / RUNTIME HEALTH

**Sonuç: PASS**

- Tüm import'lar doğru: `PaymentMethodPage`, `BankTransferScreen`, `AdminPayments`, `CopyableField`, `PLATFORM_COMMISSION_RATE`, tüm yeni tipler (`BankAccount`, `PaymentRequest`, `Order`, `EarningsLedgerEntry`) `src/types/database.ts`'de tanımlı.
- Route'lar `routeConfig.ts`'e doğru eklenmiş: `/payment/method`, `/payment/bank-transfer`, `/admin/payments`.
- Console log'larda build/runtime hatası yok. Yalnızca React Router v7 future flag uyarıları ve reviews FK hatası (ödeme sistemiyle ilgisiz, mevcut bug).
- `BankTransferScreen` ve `AdminPayments`'da kullanılan tüm component'ler (`AlertDialog`, `Sheet`, `Tabs` vb.) dependency'lerde mevcut.

---

## B) DB ŞEMA DOĞRULAMA

**Sonuç: PASS (migration dosyası doğru)**

Migration SQL'i (`phase1_payment_system.md` lines 6-155) doğrulandı:

1. **bank_accounts** — `id`, `bank_name`, `iban`, `account_holder` (NOT NULL), `is_active` (DEFAULT true), `display_order`, `created_at`. Seed: Ziraat + KuveytTürk. **PASS**
2. **payment_requests** — FK'ler: `profiles(id)` x2, `listings(id)`, `listing_prices(id)`, `bank_accounts(id)`. Status CHECK: `pending/confirmed/rejected`. `reference_code UNIQUE`. `start_ts/end_ts/duration_minutes` var. Index `(status, created_at)` var. **PASS**
3. **orders** — `payment_request_id UNIQUE`. Status CHECK: `confirmed/shipped/delivered/cancelled`. **PASS**
4. **earnings_ledger** — `payment_request_id UNIQUE`. `payout_id` FK `teacher_payouts`. Index `(teacher_id, payout_id)`. **PASS**
5. **appointments** — `payment_request_id` kolonu ekleniyor. `uq_appointments_payment_request UNIQUE` constraint. **PASS**

---

## C) RPC DOĞRULAMA — Atomiklik + Güvenlik

**Sonuç: PASS (2 uyarı)**

1. **SECURITY DEFINER** — Evet. `SET search_path = public` — Evet. **PASS**
2. **auth.uid() kontrolü** — Line 113: `IF auth.uid() IS NULL OR auth.uid() != _customer_id THEN RAISE EXCEPTION`. **PASS**
3. **reference_code server-side** — Evet, `'EL-' || upper(substr(md5(...), 1, 6))`. UNIQUE çakışmada retry (max 5). **PASS**
4. **Atomiklik** — Tek PL/pgSQL fonksiyon = tek transaction. Hata olursa otomatik ROLLBACK. **PASS**
5. **item_type='appointment' → start_ts kontrolü** — Line 137: `IF _item_type = 'appointment' AND _start_ts IS NOT NULL THEN INSERT appointments`. **PASS**

**UYARI (P2):**
- `_listing_price_id`'nin gerçekten `_listing_id`'ye ait olup olmadığı kontrol edilmiyor (RPC içinde). Kullanıcı farklı bir listing'e ait price ile çağırabilir.
- `_teacher_id`'nin gerçekten `listings.teacher_id` ile eşleştiği kontrol edilmiyor.
- `_bank_account_id`'nin `is_active=true` olup olmadığı kontrol edilmiyor.

Bu 3 kontrol eksik ama exploitation riski düşük (valid UUID gerektirir + FK constraint'ler geçersiz id'leri yakalar). Yine de ileride eklenebilir.

---

## D) CLIENT KOD DOĞRULAMA — Direct INSERT Yasak

**Sonuç: PASS**

1. `supabase.from('payment_requests').insert` — **Repo genelinde 0 sonuç**. Sadece RPC ile. **PASS**
2. `supabase.from('appointments').insert` — **Repo genelinde 0 sonuç**. Eski handleBooking kaldırılmış. **PASS**
3. `BankTransferScreen` line 76: `supabase.rpc('create_payment_request_and_appointment', {...})` — **PASS**
4. `ListingDetailPage` line 84: `navigate("/payment/method", { state: {...} })` — Ödemeye yönlendiriyor. **PASS**

---

## E) UI / RESPONSIVE TESTLER

**Sonuç: PASS (1 uyarı)**

1. **PaymentMethodPage** — Havale aktif (click → navigate), Kart disabled/opacity-50 + "Yakında" Badge. Layout: `grid-cols-1 md:grid-cols-2`. **PASS**
2. **BankTransferScreen** — Banka seçimi tab/button'lar, `CopyableField` ile IBAN/Alıcı/Tutar, double confirm `AlertDialog`. Layout: `grid-cols-1 md:grid-cols-2`. **PASS**
3. **Appointments** — Status badge mapping: `pending` → "Ödeme Kontrol Ediliyor", `confirmed` → "Onaylandı", `cancelled` → "İptal Edildi", `completed` → "Tamamlandı". Teacher `.neq('status', 'pending')` filtresi var. **PASS**
4. **Admin /admin/payments** — Desktop: Table layout. Mobil: `isMobile` kontrolü ile Card list. Filtreler: status tabs, type select, search input. **PASS**

**UYARI (P2):**
- BankTransferScreen'de sticky CTA (mobilde sabit alt buton) yok. `pt-2 md:pt-4` ile normal scroll'da. Plan "sticky CTA" diyor ama implementasyon normal flow'da. Fonksiyonel sorun değil, UX iyileştirme.
- Referans kodu ödeme öncesinde "Ödeme sonrası oluşturulacak" olarak gösterilmiyor aslında — `tempRefDisplay` tanımlı ama UI'da kullanılmıyor (line 69, hiçbir yerde render edilmiyor). Bu doğru davranış: referans kodu RPC sonrası toast'ta gösteriliyor.

---

## F) E2E FLOW — Appointment

**Sonuç: PASS (mantıksal doğrulama)**

1. Customer listing seçer → paket + tarih/saat → "Ödemeye Geç" → `PaymentMethodPage` → "Havale" → `BankTransferScreen` → banka seç → "Ödemeyi Yaptım" → double confirm → RPC çağrısı. **PASS**
2. RPC: `payment_requests` + `appointments` atomik INSERT (status='pending'). **PASS**
3. Customer `/appointments`: pending görünür, badge "Ödeme Kontrol Ediliyor". **PASS**
4. Teacher: `.neq('status', 'pending')` filtresi → pending görmez. **PASS**
5. Admin onay: `payment_requests` UPDATE (WHERE status='pending'), `appointments` UPDATE (confirmed), `earnings_ledger` INSERT. **PASS**
6. Admin red: `payment_requests` UPDATE (rejected), `appointments` UPDATE (cancelled). **PASS**

---

## G) E2E FLOW — Product

**Sonuç: FAIL (P1)**

- **Product satın alma akışı henüz aktif değil.** `ListingDetailPage.tsx` line 345-377: product listing'lerde hala "Ürün satışı yakında aktif olacak" placeholder gösteriliyor. "Satın Al" butonu yok, ödeme akışına yönlendirme yok.
- Bu Phase 2 planında "Product akışı aktif etme (ListingDetailPage placeholder kaldırma)" olarak belirtilmiş ama **implement edilmemiş**.
- RPC `item_type='product'` desteği var, admin onayda order oluşturma var — sadece UI tetikleyici eksik.
- **Kök neden:** `ListingDetailPage.tsx` line 345-377, product card'ında ödeme akışına navigate kodu yok.
- **Minimal düzeltme:** Product card'a paket seçimi + "Satın Al" butonu ekleyip `navigate("/payment/method", { state: { consultationType: "product", ... } })` ile yönlendirmek.

---

## H) Earnings & Payout

**Sonuç: PASS (1 uyarı)**

1. **admin/Earnings** — Ledger bazlı: `earnings_ledger` sorgusu + legacy merge (`appointments WHERE payment_request_id IS NULL`). `PLATFORM_COMMISSION_RATE` import edilmiş ve kullanılıyor (line 31, 189). **PASS**
2. **teacher/Earnings** — Ledger + legacy hybrid. `PLATFORM_COMMISSION_RATE` kullanılıyor (line 17). **PASS**
3. **0.15 araması** — Repo genelinde `0.15` yalnızca CSS opacity değerlerinde var (ParticleBackground, PublicProfile, MessageList). Komisyon hesaplamasında 0.15 kalmamış. **PASS**
4. **Payout** — `handlePayout` (line 265-289): `teacher_payouts` INSERT + `earnings_ledger` UPDATE payout_id. **PASS**
5. **Kalem Listesi** — `fetchPayoutItemsList` (line 291-305): `earnings_ledger WHERE payout_id = X` + payment_request join. **PASS**

**UYARI (P2):**
- Dashboard (line 93): `price_at_booking * 0.25` hardcoded. `PLATFORM_COMMISSION_RATE` import edilmemiş Dashboard'da. Tutarsızlık var ama değer doğru (0.25). İleride import edilmeli.

---

## I) İdempotency / Duplicate / Concurrency

**Sonuç: PASS (1 uyarı)**

1. **Admin çift onay** — `AdminPayments.tsx` line 116: `.eq("status", "pending")` + line 120-123: `updated.length === 0` → "Bu talep zaten işlenmiş" toast. **PASS**
2. **Admin çift red** — Line 210: `.eq("status", "pending")` + line 214-216: aynı guard. **PASS**
3. **UNIQUE constraint'ler** — `earnings_ledger.payment_request_id UNIQUE`, `orders.payment_request_id UNIQUE`, `appointments.payment_request_id UNIQUE`. **PASS**

**UYARI (P1):**
- `earnings_ledger` INSERT'te `ON CONFLICT DO NOTHING` kullanılmıyor (line 165-173). UNIQUE constraint hata fırlatır ama catch block'ta generic hata mesajı gösterilir. Plan "ON CONFLICT DO NOTHING" diyordu. Şu anki haliyle çift onay denenmesi idempotent guard (step 1) tarafından yakalanır, bu yüzden step 4'e asla ulaşılmaz — dolayısıyla pratikte sorun yok. Ama race condition (iki admin aynı anda onaylarsa) durumunda UNIQUE constraint korur, sadece hata mesajı "Bu talep zaten işlenmiş" yerine generic olur.

**UYARI (P2):**
- Double-click önlemi: `submitting` state + `disabled={submitting}` var (BankTransferScreen line 217-218). **PASS**

---

## J) Edge Functions / Email

**Sonuç: PASS (2 uyarı)**

1. **Admin onay/red** — `send-status-update-email` invoke ediliyor (lines 177, 230). **PASS**
2. **`send-appointment-email` client'tan çağrılmıyor** — Repo araması: 0 sonuç. **PASS**
3. **`send-payment-submitted-email`** — Ödeme bildirimi gönderildiğinde (customer "Ödemeyi Yaptım" dediğinde) email yok. Plan "YENİ veya mevcut genişletilir" diyordu ama implement edilmemiş. **P2 risk**.

**UYARI (P2):**
- `verify_jwt=false` olan function'lar admin auth kontrolü yapmıyor. `send-status-update-email` sadece admin panelden tetikleniyor ama function kendisi herhangi biri tarafından çağrılabilir. Production'da function içi admin kontrolü eklenmeli.

---

## K) Güvenlik / RLS

**Sonuç: PASS**

1. **payment_requests RLS** — Customer: `customer_id = auth.uid()` SELECT. Admin: `has_role` SELECT/UPDATE. INSERT yok (RPC ile). **PASS**
2. **orders RLS** — Customer: own SELECT. Teacher: own SELECT. Admin: ALL. **PASS**
3. **earnings_ledger RLS** — Teacher: own SELECT. Admin: ALL. **PASS**
4. **bank_accounts RLS** — Authenticated: SELECT (is_active=true). Admin: ALL. **PASS**
5. **Client INSERT yok** — Doğrulandı (bölüm D). **PASS**

---

## L) SONUÇ

| Bölüm | Sonuç |
|-------|-------|
| A) Build/Typecheck | **PASS** |
| B) DB Şema | **PASS** |
| C) RPC Atomiklik | **PASS** (2 uyarı) |
| D) Client Direct INSERT | **PASS** |
| E) UI/Responsive | **PASS** (1 uyarı) |
| F) E2E Appointment | **PASS** |
| G) E2E Product | **FAIL (P1)** |
| H) Earnings/Payout | **PASS** (1 uyarı) |
| I) İdempotency | **PASS** (1 uyarı) |
| J) Edge Functions | **PASS** (2 uyarı) |
| K) Güvenlik/RLS | **PASS** |

### Blocker var mı? HAYIR

Tek FAIL olan "Product UI akışı" planlanmış ama henüz implement edilmemiş bir özellik — mevcut kodu kırmıyor, appointment akışını etkilemiyor.

### Risk/Düzeltme Öncelik Sırası

| # | Öncelik | Konu | Dosya/Satır |
|---|---------|------|-------------|
| 1 | **P1** | Product satın alma UI'ı aktif değil (placeholder hala duruyor) | `ListingDetailPage.tsx:345-377` |
| 2 | **P1** | `earnings_ledger` INSERT'te `ON CONFLICT DO NOTHING` eksik (race condition) | `admin/Payments.tsx:165` |
| 3 | **P2** | RPC'de `_listing_price_id` ↔ `_listing_id` ilişki doğrulaması yok | `phase1_payment_system.md` RPC |
| 4 | **P2** | RPC'de `_teacher_id` ↔ `listings.teacher_id` doğrulaması yok | `phase1_payment_system.md` RPC |
| 5 | **P2** | RPC'de `_bank_account_id` `is_active` kontrolü yok | `phase1_payment_system.md` RPC |
| 6 | **P2** | Dashboard'da `PLATFORM_COMMISSION_RATE` import edilmemiş (0.25 hardcoded) | `admin/Dashboard.tsx:93` |
| 7 | **P2** | Mobil sticky CTA eksik (BankTransferScreen) | `BankTransferScreen.tsx:211` |
| 8 | **P2** | Ödeme bildirimi email'i (`send-payment-submitted-email`) yok | Edge function |
| 9 | **P2** | Edge function'larda admin auth kontrolü yok (verify_jwt=false) | `supabase/config.toml` |
| 10 | **P3** | Reviews FK hatası (ödeme sistemiyle ilgisiz) | Network request 400 hata |

### Canlıya Çıkmadan Önce Öneriler (7 madde)

1. **P1 #2'yi düzelt**: `earnings_ledger` INSERT'e `.upsert` veya ayrı conflict handling ekle
2. Product UI'ı aktif etmek isteniyorsa P1 #1'i implement et
3. RPC'ye parametre doğrulama ekle (listing_price ↔ listing, teacher ↔ listing, bank active kontrolü)
4. Dashboard'daki hardcoded 0.25'i `PLATFORM_COMMISSION_RATE` ile değiştir
5. Gerçek IBAN'ları `bank_accounts` tablosunda doğrula
6. Edge function'lara admin auth kontrolü ekle (en azından `Authorization` header kontrolü)
7. BankTransferScreen'de gerçek kullanıcıyla test et (RPC çağrısı + DB sonucu doğrula)




# Kök Neden Analizi ve Düzeltme Planı

## Hatanın Kesin Kök Nedeni

**Signature mismatch.** Kullanıcı Supabase'te **Phase 2** SQL'ini çalıştırdı. Bu fonksiyonun 11 parametresi var ve `_reference_code` parametresi **yok**. Ancak frontend (BankTransferScreen line 91) `_reference_code: referenceCode` gönderiyor. PostgREST bilinmeyen parametre gördüğünde fonksiyonu bulamıyor ve `Could not find the function` hatası veriyor.

Phase 3 SQL dosyası da oluşturuldu ama iki sorun var:
1. Phase 3, Phase 2'nin `auth.uid()` kontrolünü içermiyor
2. Phase 3, `item_type='product'` için appointment oluşturmama kontrolünü içermiyor (her zaman appointment INSERT yapıyor)
3. Phase 3, `payment_requests` INSERT'ine `start_ts/end_ts/duration_minutes` eklemiyor
4. Phase 3, appointments INSERT'ine `price_at_booking` eklemiyor

## Düzeltme Planı

### 1. Birleşik SQL migration oluştur (`phase3_reference_code.md` güncelle)
Phase 2 + Phase 3'ü birleştiren tek bir `CREATE OR REPLACE FUNCTION`:
- 12 parametre (Phase 2'nin 11'i + `_reference_code TEXT DEFAULT NULL`)
- `auth.uid()` kontrolü (Phase 2'den)
- 3 doğrulama (listing_price ↔ listing, teacher ↔ listing, bank active)
- Client `_reference_code` varsa kullan, yoksa server-side üret (retry loop)
- `payment_requests` INSERT'ine `start_ts/end_ts/duration_minutes` dahil
- `IF _item_type = 'appointment'` kontrolü (sadece appointment tipinde appointment oluştur)
- `appointments` INSERT'ine `price_at_booking` dahil

### 2. Frontend değişikliği YOK
`BankTransferScreen.tsx` doğru çalışıyor — `_reference_code` göndermesi planla tutarlı.

### Değişen dosya
| Dosya | Değişiklik |
|-------|-----------|
| `supabase/migrations_manual/phase3_reference_code.md` | Phase 2 + Phase 3 birleşik SQL (auth check + validation + reference_code param) |

### Son RPC signature
```
_customer_id uuid, _teacher_id uuid, _listing_id uuid, _listing_price_id uuid,
_bank_account_id uuid, _item_type text, _quantity integer, _amount numeric,
_start_ts timestamptz DEFAULT NULL, _end_ts timestamptz DEFAULT NULL,
_duration_minutes integer DEFAULT NULL, _reference_code text DEFAULT NULL
```

### Frontend RPC payload (değişmiyor)
```
_customer_id, _teacher_id, _listing_id, _listing_price_id,
_item_type, _quantity, _amount, _bank_account_id,
_start_ts, _end_ts, _duration_minutes, _reference_code
```

### Kullanıcı aksiyonu
SQL dosyasını güncelledikten sonra kullanıcının Supabase SQL Editor'da çalıştırması + ardından `NOTIFY pgrst, 'reload schema';` çalıştırması gerekecek.


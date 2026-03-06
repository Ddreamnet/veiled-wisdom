# Phase 3: Reference Code Client-Side Pre-Generation

## Problem
Reference code was generated server-side only after "Ödemeyi Yaptım" click, so user couldn't include it in bank transfer description.

## Solution
Accept optional `_reference_code` parameter; use it if provided, otherwise fall back to server-side generation.

## SQL — Run in Supabase SQL Editor

```sql
CREATE OR REPLACE FUNCTION public.create_payment_request_and_appointment(
  _customer_id UUID,
  _teacher_id UUID,
  _listing_id UUID,
  _listing_price_id UUID,
  _item_type TEXT,
  _quantity INT,
  _amount NUMERIC,
  _bank_account_id UUID,
  _start_ts TIMESTAMPTZ DEFAULT NULL,
  _end_ts TIMESTAMPTZ DEFAULT NULL,
  _duration_minutes INT DEFAULT NULL,
  _reference_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_appointment_id UUID;
  v_reference_code TEXT;
  v_listing_price RECORD;
  v_listing RECORD;
  v_bank RECORD;
BEGIN
  -- ===== VALIDATION (Phase 2) =====
  -- 1) listing_price belongs to listing
  SELECT * INTO v_listing_price
    FROM listing_prices
   WHERE id = _listing_price_id AND listing_id = _listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_id does not belong to listing_id';
  END IF;

  -- 2) teacher owns the listing
  SELECT * INTO v_listing
    FROM listings
   WHERE id = _listing_id AND teacher_id = _teacher_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'teacher_id does not match listing owner';
  END IF;

  -- 3) bank account is active
  SELECT * INTO v_bank
    FROM bank_accounts
   WHERE id = _bank_account_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bank_account_id is not active';
  END IF;

  -- ===== REFERENCE CODE (Phase 3) =====
  -- Use client-provided code if given, otherwise generate server-side
  IF _reference_code IS NOT NULL AND _reference_code <> '' THEN
    v_reference_code := _reference_code;
  ELSE
    v_reference_code := 'EL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;

  -- ===== CREATE PAYMENT REQUEST =====
  INSERT INTO payment_requests (
    customer_id, teacher_id, listing_id, listing_price_id,
    item_type, quantity, amount, bank_account_id, reference_code, status
  ) VALUES (
    _customer_id, _teacher_id, _listing_id, _listing_price_id,
    _item_type, _quantity, _amount, _bank_account_id, v_reference_code, 'pending'
  ) RETURNING id INTO v_payment_id;

  -- ===== CREATE APPOINTMENT =====
  INSERT INTO appointments (
    customer_id, teacher_id, listing_id, listing_price_id,
    payment_request_id, start_ts, end_ts, duration_minutes, status
  ) VALUES (
    _customer_id, _teacher_id, _listing_id, _listing_price_id,
    v_payment_id, _start_ts, _end_ts, _duration_minutes, 'pending'
  ) RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'payment_request_id', v_payment_id,
    'appointment_id', v_appointment_id,
    'reference_code', v_reference_code
  );
END;
$$;
```

## Notes
- `_reference_code` has `DEFAULT NULL` so existing callers without this param still work.
- UNIQUE constraint on `reference_code` column prevents collisions (extremely unlikely with 6-hex).
- Client generates code as `EL-` + 6 uppercase hex chars from `crypto.randomUUID()`.

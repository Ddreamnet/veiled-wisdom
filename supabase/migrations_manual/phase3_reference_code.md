# Phase 3: Reference Code Client-Side Pre-Generation

## Problem
Reference code was generated server-side only after "Ödemeyi Yaptım" click, so user couldn't include it in bank transfer description.

## Solution
Accept optional `_reference_code` parameter; use it if provided, otherwise fall back to server-side generation.

## SQL — Run in Supabase SQL Editor

```sql
DROP FUNCTION IF EXISTS public.create_payment_request_and_appointment(uuid, uuid, uuid, uuid, uuid, text, integer, numeric, timestamptz, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.create_payment_request_and_appointment(
  _customer_id uuid,
  _teacher_id uuid,
  _listing_id uuid,
  _listing_price_id uuid,
  _bank_account_id uuid,
  _item_type text,
  _quantity integer,
  _amount numeric,
  _start_ts timestamptz DEFAULT NULL,
  _end_ts timestamptz DEFAULT NULL,
  _duration_minutes integer DEFAULT NULL,
  _reference_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref text;
  _pr_id uuid;
  _apt_id uuid;
  _attempt int := 0;
  _actual_teacher_id uuid;
  _price_listing_id uuid;
  _bank_active boolean;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL OR auth.uid() != _customer_id THEN
    RAISE EXCEPTION 'Unauthorized: customer_id mismatch';
  END IF;

  -- Validate listing_price belongs to listing
  SELECT listing_id INTO _price_listing_id
  FROM listing_prices WHERE id = _listing_price_id;
  
  IF _price_listing_id IS NULL THEN
    RAISE EXCEPTION 'Invalid listing_price_id';
  END IF;
  IF _price_listing_id != _listing_id THEN
    RAISE EXCEPTION 'listing_price_id does not belong to listing_id';
  END IF;

  -- Validate teacher_id matches listing.teacher_id
  SELECT teacher_id INTO _actual_teacher_id
  FROM listings WHERE id = _listing_id;
  
  IF _actual_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Invalid listing_id';
  END IF;
  IF _actual_teacher_id != _teacher_id THEN
    RAISE EXCEPTION 'teacher_id does not match listing owner';
  END IF;

  -- Validate bank_account is active
  SELECT is_active INTO _bank_active
  FROM bank_accounts WHERE id = _bank_account_id;
  
  IF _bank_active IS NULL THEN
    RAISE EXCEPTION 'Invalid bank_account_id';
  END IF;
  IF _bank_active != true THEN
    RAISE EXCEPTION 'Bank account is not active';
  END IF;

  -- Use client-provided reference code or generate server-side
  IF _reference_code IS NOT NULL AND _reference_code <> '' THEN
    _ref := _reference_code;
  ELSE
    _ref := NULL; -- will be generated in the loop
  END IF;

  -- Insert payment request (with retry for reference code uniqueness)
  LOOP
    _attempt := _attempt + 1;
    IF _ref IS NULL THEN
      _ref := 'EL-' || upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 6));
    END IF;
    BEGIN
      INSERT INTO payment_requests (
        customer_id, teacher_id, listing_id, listing_price_id,
        bank_account_id, item_type, quantity, amount,
        reference_code, status,
        start_ts, end_ts, duration_minutes
      ) VALUES (
        _customer_id, _teacher_id, _listing_id, _listing_price_id,
        _bank_account_id, _item_type, _quantity, _amount,
        _ref, 'pending',
        _start_ts, _end_ts, _duration_minutes
      ) RETURNING id INTO _pr_id;
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      IF _attempt >= 5 THEN
        RAISE EXCEPTION 'Could not generate unique reference code';
      END IF;
      _ref := NULL; -- force regeneration on next attempt
    END;
  END LOOP;

  -- Create appointment only for appointment type
  IF _item_type = 'appointment' AND _start_ts IS NOT NULL THEN
    INSERT INTO appointments (
      listing_id, customer_id, teacher_id,
      status, start_ts, end_ts, duration_minutes,
      price_at_booking, payment_request_id
    ) VALUES (
      _listing_id, _customer_id, _teacher_id,
      'pending', _start_ts, _end_ts, _duration_minutes,
      _amount, _pr_id
    ) RETURNING id INTO _apt_id;
  END IF;

  RETURN jsonb_build_object(
    'payment_request_id', _pr_id,
    'appointment_id', _apt_id,
    'reference_code', _ref
  );
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

## Notes
- `DROP FUNCTION` with old 11-param signature ensures no overload conflict.
- `_reference_code` has `DEFAULT NULL` so existing callers without this param still work.
- UNIQUE constraint on `reference_code` column prevents collisions.
- Client generates code as `EL-` + 6 uppercase hex chars from `crypto.randomUUID()`.
- `auth.uid()` check, all 3 validations, conditional appointment creation, and `price_at_booking` are preserved from Phase 2.

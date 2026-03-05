# Phase 1 — DB Migration SQL

Bu SQL'i Supabase SQL Editor'da çalıştırın.

```sql
-- 1. bank_accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  iban text NOT NULL,
  account_holder text NOT NULL,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin can manage bank accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.bank_accounts (bank_name, iban, account_holder, display_order) VALUES
  ('Ziraat Bankası', 'TR00 0000 0000 0000 0000 0000 00', 'LEYL TEKNOLOJİ A.Ş.', 1),
  ('KuveytTürk', 'TR00 0000 0000 0000 0000 0000 00', 'LEYL TEKNOLOJİ A.Ş.', 2);

-- 2. payment_requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  listing_price_id uuid NOT NULL REFERENCES public.listing_prices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('appointment', 'product')),
  quantity int DEFAULT 1,
  amount numeric NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  reference_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  admin_note text,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  start_ts timestamptz,
  end_ts timestamptz,
  duration_minutes int
);
CREATE INDEX idx_payment_requests_status_created ON public.payment_requests (status, created_at);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer can read own payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Admin can read all payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update payment requests" ON public.payment_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL UNIQUE REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  quantity int NOT NULL,
  total_amount numeric NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer can read own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Teacher can read own orders" ON public.orders FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin can manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. earnings_ledger
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL UNIQUE REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('appointment', 'product')),
  source_id uuid NOT NULL,
  gross_amount numeric NOT NULL,
  teacher_amount numeric NOT NULL,
  platform_amount numeric NOT NULL,
  payout_id uuid REFERENCES public.teacher_payouts(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_earnings_ledger_teacher_payout ON public.earnings_ledger (teacher_id, payout_id);
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher can read own earnings" ON public.earnings_ledger FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin can manage earnings" ON public.earnings_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. appointments — payment_request_id kolonu
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_request_id uuid REFERENCES public.payment_requests(id);
ALTER TABLE public.appointments ADD CONSTRAINT uq_appointments_payment_request UNIQUE (payment_request_id);

-- 6. RPC: create_payment_request_and_appointment
CREATE OR REPLACE FUNCTION public.create_payment_request_and_appointment(
  _customer_id uuid,
  _teacher_id uuid,
  _listing_id uuid,
  _listing_price_id uuid,
  _item_type text,
  _quantity int,
  _amount numeric,
  _bank_account_id uuid,
  _start_ts timestamptz DEFAULT NULL,
  _end_ts timestamptz DEFAULT NULL,
  _duration_minutes int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_code text;
  _pr_id uuid;
  _apt_id uuid := NULL;
  _retries int := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _customer_id THEN
    RAISE EXCEPTION 'Unauthorized: customer_id must match authenticated user';
  END IF;
  LOOP
    _ref_code := 'EL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    BEGIN
      INSERT INTO payment_requests (
        customer_id, teacher_id, listing_id, listing_price_id,
        item_type, quantity, amount, bank_account_id, reference_code,
        status, start_ts, end_ts, duration_minutes
      ) VALUES (
        _customer_id, _teacher_id, _listing_id, _listing_price_id,
        _item_type, _quantity, _amount, _bank_account_id, _ref_code,
        'pending', _start_ts, _end_ts, _duration_minutes
      )
      RETURNING id INTO _pr_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      _retries := _retries + 1;
      IF _retries > 5 THEN
        RAISE EXCEPTION 'Could not generate unique reference code after 5 retries';
      END IF;
    END;
  END LOOP;
  IF _item_type = 'appointment' AND _start_ts IS NOT NULL THEN
    INSERT INTO appointments (
      listing_id, customer_id, teacher_id,
      status, start_ts, end_ts, duration_minutes,
      price_at_booking, payment_request_id
    ) VALUES (
      _listing_id, _customer_id, _teacher_id,
      'pending', _start_ts, _end_ts, _duration_minutes,
      _amount, _pr_id
    )
    RETURNING id INTO _apt_id;
  END IF;
  RETURN jsonb_build_object(
    'payment_request_id', _pr_id,
    'appointment_id', _apt_id,
    'reference_code', _ref_code
  );
END;
$$;
```

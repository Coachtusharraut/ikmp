
-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can look up a coupon by code (needed to validate at checkout)
CREATE POLICY "Users can read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ EXTEND ENROLLMENTS ============
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow users to create their own 'pending' or 'coupon' enrollments; admins approve.
-- Existing policies already allow users to manage own enrollments; add an admin-manage policy.
DO $$ BEGIN
  CREATE POLICY "Admins manage all enrollments" ON public.course_enrollments
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ REDEEM COUPON RPC ============
-- Atomic: validates code, checks course match, uses/expiry, computes final price,
-- increments uses_count, inserts enrollment (free/coupon if final=0, else pending).
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code TEXT, _course_id UUID)
RETURNS TABLE(enrollment_id UUID, final_price NUMERIC, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _c RECORD;
  _course RECORD;
  _final NUMERIC;
  _status TEXT;
  _eid UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _course FROM public.courses WHERE id = _course_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;

  SELECT * INTO _c FROM public.coupons
    WHERE upper(code) = upper(_code) AND active = true
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid coupon code'; END IF;

  IF _c.expires_at IS NOT NULL AND _c.expires_at < now() THEN
    RAISE EXCEPTION 'Coupon expired';
  END IF;
  IF _c.max_uses IS NOT NULL AND _c.uses_count >= _c.max_uses THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;
  IF _c.course_id IS NOT NULL AND _c.course_id <> _course_id THEN
    RAISE EXCEPTION 'Coupon not valid for this course';
  END IF;

  IF _c.discount_type = 'percent' THEN
    _final := GREATEST(0, _course.price - (_course.price * LEAST(_c.discount_value, 100) / 100));
  ELSE
    _final := GREATEST(0, _course.price - _c.discount_value);
  END IF;

  IF _final <= 0 THEN _status := 'coupon'; ELSE _status := 'pending'; END IF;

  INSERT INTO public.course_enrollments (user_id, course_id, payment_status, amount_paid, coupon_code, payment_method)
    VALUES (_uid, _course_id, _status, _final, _c.code, 'coupon')
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET coupon_code = EXCLUDED.coupon_code,
          amount_paid = EXCLUDED.amount_paid,
          payment_status = CASE WHEN course_enrollments.payment_status IN ('paid','free','coupon')
                                THEN course_enrollments.payment_status
                                ELSE EXCLUDED.payment_status END
    RETURNING id INTO _eid;

  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = _c.id;

  RETURN QUERY SELECT _eid, _final, _status;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO authenticated;

-- ============ SITE SETTINGS: PAYMENT INFO ============
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Ensure course_enrollments has unique(user_id, course_id) for the ON CONFLICT above
DO $$ BEGIN
  ALTER TABLE public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_course_uniq UNIQUE (user_id, course_id);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

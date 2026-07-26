CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text, _course_id uuid)
 RETURNS TABLE(enrollment_id uuid, final_price numeric, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHERE upper(code) = upper(btrim(_code)) AND active = true
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

  INSERT INTO public.course_enrollments (user_id, course_id, payment_status, amount_paid, coupon_code, payment_method, approved_at)
    VALUES (_uid, _course_id, _status, _final, _c.code, 'coupon',
            CASE WHEN _status = 'coupon' THEN now() ELSE NULL END)
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET coupon_code = EXCLUDED.coupon_code,
          amount_paid = EXCLUDED.amount_paid,
          payment_method = CASE WHEN EXCLUDED.payment_status = 'coupon'
                                THEN 'coupon' ELSE course_enrollments.payment_method END,
          approved_at = CASE WHEN EXCLUDED.payment_status = 'coupon'
                             THEN now() ELSE course_enrollments.approved_at END,
          -- a fully-discounted coupon always grants access immediately,
          -- even over an existing pending manual payment
          payment_status = CASE
            WHEN EXCLUDED.payment_status = 'coupon' THEN 'coupon'
            WHEN course_enrollments.payment_status IN ('paid','free','coupon')
              THEN course_enrollments.payment_status
            ELSE EXCLUDED.payment_status END
    RETURNING id INTO _eid;

  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = _c.id;

  RETURN QUERY SELECT _eid, _final, _status;
END $function$;
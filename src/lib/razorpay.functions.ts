import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: is Razorpay configured, and what's the publishable key id? */
export const getRazorpayConfig = createServerFn({ method: "POST" }).handler(async () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  return { enabled: !!keyId && !!process.env.RAZORPAY_KEY_SECRET, keyId: keyId ?? null };
});

/** Create a Razorpay order for a course. Price is computed server-side. */
export const createCourseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; couponCode?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { createOrder, applyCoupon } = await import("@/lib/razorpay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error: cErr } = await supabaseAdmin
      .from("courses")
      .select("id,title,price,is_free")
      .eq("id", data.courseId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!course) throw new Error("Course not found");
    if (course.is_free) throw new Error("This course is free");

    let coupon: { id: string; code: string; discount_type: string; discount_value: number } | null =
      null;
    const code = data.couponCode?.trim();
    if (code) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("id,code,discount_type,discount_value,active,expires_at,max_uses,uses_count,course_id")
        .ilike("code", code)
        .maybeSingle();
      if (
        c &&
        c.active &&
        (!c.expires_at || new Date(c.expires_at) > new Date()) &&
        (c.max_uses == null || (c.uses_count ?? 0) < c.max_uses) &&
        (!c.course_id || c.course_id === course.id)
      ) {
        coupon = c as any;
      }
    }

    const amount = applyCoupon(Number(course.price), coupon);
    if (amount <= 0) throw new Error("This coupon makes the course free — apply it instead of paying");

    const paise = Math.round(amount * 100);
    if (paise < 100) throw new Error("Amount too small for online payment");

    const order = await createOrder(paise, `c_${course.id.slice(0, 8)}_${Date.now()}`, {
      course_id: course.id,
      user_id: context.userId,
      coupon: coupon?.code ?? "",
    });

    await supabaseAdmin.from("course_enrollments").upsert(
      {
        user_id: context.userId,
        course_id: course.id,
        payment_status: "pending",
        amount_paid: amount,
        coupon_code: coupon?.code ?? null,
        payment_method: "razorpay",
        payment_reference: order.id,
      } as any,
      { onConflict: "user_id,course_id" }
    );

    return { orderId: order.id, amount: order.amount, currency: order.currency, rupees: amount };
  });

/** Verify a Razorpay payment and activate the enrolment. */
export const verifyCoursePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      courseId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => d
  )
  .handler(async ({ data, context }) => {
    const { verifySignature, fetchPayment } = await import("@/lib/razorpay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!verifySignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
      throw new Error("Payment signature verification failed");
    }

    const payment = await fetchPayment(data.razorpay_payment_id);
    if (payment.order_id !== data.razorpay_order_id) throw new Error("Order mismatch");
    if (!["captured", "authorized"].includes(payment.status)) {
      throw new Error(`Payment not completed (status: ${payment.status})`);
    }

    const { error } = await supabaseAdmin
      .from("course_enrollments")
      .update({
        payment_status: "paid",
        amount_paid: payment.amount / 100,
        payment_method: payment.method ? `razorpay:${payment.method}` : "razorpay",
        payment_reference: payment.id,
        approved_at: new Date().toISOString(),
      } as any)
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

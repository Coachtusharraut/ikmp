import { createHmac, timingSafeEqual } from "node:crypto";

export function getKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

/** Create an order on Razorpay. amountInPaise must be an integer >= 100 */
export async function createOrder(amountInPaise: number, receipt: string, notes: Record<string, string>) {
  const { keyId, keySecret } = getKeys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes,
      payment_capture: 1,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay order failed [${res.status}]: ${text}`);
  return JSON.parse(text) as { id: string; amount: number; currency: string };
}

export function verifySignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = getKeys();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Confirm with Razorpay that the payment is actually captured/authorized. */
export async function fetchPayment(paymentId: string) {
  const { keyId, keySecret } = getKeys();
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay payment lookup failed [${res.status}]: ${text}`);
  return JSON.parse(text) as {
    id: string;
    order_id: string;
    status: string;
    amount: number;
    method: string;
  };
}

/** Server-side price calculation: course price minus a valid coupon, in rupees. */
export function applyCoupon(
  price: number,
  coupon: { discount_type: string; discount_value: number } | null
) {
  if (!coupon) return price;
  const v = Number(coupon.discount_value);
  if (coupon.discount_type === "percent") {
    return Math.max(0, price - (price * Math.min(v, 100)) / 100);
  }
  return Math.max(0, price - v);
}

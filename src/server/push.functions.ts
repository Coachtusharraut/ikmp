import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
});

export const saveSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        userAgent: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Upsert by endpoint
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPushToAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(500),
        url: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
    if (!pub || !priv) {
      throw new Error("VAPID keys not configured.");
    }

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subject, pub, priv);

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (error) throw new Error(error.message);

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url || "/",
    });

    let sent = 0;
    let failed = 0;
    const deadIds: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent += 1;
        } catch (e: any) {
          failed += 1;
          if (e?.statusCode === 404 || e?.statusCode === 410) deadIds.push(s.id);
        }
      }),
    );

    if (deadIds.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", deadIds);
    }

    await supabaseAdmin.from("push_notifications_log").insert({
      title: data.title,
      body: data.body,
      url: data.url || null,
      sent_count: sent,
      failed_count: failed,
      created_by: context.userId,
    });

    return { sent, failed, total: subs?.length ?? 0 };
  });

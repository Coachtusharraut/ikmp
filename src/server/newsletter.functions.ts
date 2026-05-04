import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminFromAccessToken } from "@/server/admin-auth.server";

/**
 * Sends a newsletter as an in-app announcement banner to ALL users.
 * Email delivery requires an email domain to be configured. When the
 * `LOVABLE_API_KEY` and an email domain exist, we additionally send via
 * the Lovable email API; otherwise we just create the announcement.
 */
export const sendNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        subject: z.string().min(1).max(200),
        bodyHtml: z.string().min(1),
        alsoEmail: z.boolean().default(true),
        alsoAnnouncement: z.boolean().default(true),
        accessToken: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const adminUser = await requireAdminFromAccessToken(data.accessToken);

    let recipientCount = 0;
    let emailAttempted = false;
    let emailSent = 0;
    let emailNote: string | null = null;

    // 1. In-app announcement banner
    if (data.alsoAnnouncement) {
      const { error } = await supabaseAdmin.from("announcements").insert({
        title: data.subject,
        body_html: data.bodyHtml,
        published: true,
        created_by: adminUser.id,
      });
      if (error) throw new Error(error.message);
    }

    // 2. Email — best effort (requires email domain + Lovable Email infra)
    if (data.alsoEmail) {
      emailAttempted = true;
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const emails = (users?.users ?? [])
        .map((u) => u.email)
        .filter((e): e is string => !!e);
      recipientCount = emails.length;

      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) {
        emailNote =
          "Email skipped: LOVABLE_API_KEY not configured. Announcement banner was posted.";
      } else {
        // Try sending via Lovable Email gateway. If no email domain is set up
        // this will return an error which we surface in the note instead of
        // failing the whole call.
        try {
          for (const to of emails) {
            const res = await fetch(
              "https://connector-gateway.lovable.dev/lovable_email/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  to,
                  subject: data.subject,
                  html: data.bodyHtml,
                }),
              },
            );
            if (res.ok) emailSent += 1;
          }
          if (emailSent === 0) {
            emailNote =
              "Email could not be sent — set up an email sender domain in Cloud → Emails to enable email delivery.";
          }
        } catch (e: any) {
          emailNote = `Email skipped: ${e?.message ?? "email service unavailable"}.`;
        }
      }
    }

    await supabaseAdmin.from("newsletter_log").insert({
      subject: data.subject,
      body_html: data.bodyHtml,
      recipient_count: emailSent,
      also_announcement: data.alsoAnnouncement,
      sent_by: adminUser.id,
    });

    return {
      ok: true,
      recipientCount,
      emailAttempted,
      emailSent,
      emailNote,
    };
  });

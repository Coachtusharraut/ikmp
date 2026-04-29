// Admin-only edge function: manages coach accounts
// Actions:
//   action=create   { email, password }      -> creates user + grants coach role
//   action=update_password { user_id, password } -> changes a coach's password
//   action=list                                -> lists all coaches with email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "Missing token" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = (body.action ?? "create").toString();

    if (action === "list") {
      const { data: roles } = await admin
        .from("user_roles")
        .select("id,user_id,role,created_at")
        .in("role", ["coach", "admin"]);
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const byId = new Map(list?.users.map((u) => [u.id, u.email ?? ""]));
      const coaches = (roles ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: byId.get(r.user_id) ?? "",
        created_at: r.created_at,
      }));
      return json({ coaches });
    }

    if (action === "update_password") {
      const userId = (body.user_id ?? "").toString();
      const password = (body.password ?? "").toString();
      if (!userId || password.length < 8) {
        return json({ error: "user_id and password (min 8 chars) required" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // default: create
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();
    if (!email || !password || password.length < 8) {
      return json({ error: "Email + password (min 8 chars) required" }, 400);
    }

    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!found) return json({ error: createErr.message }, 400);
      userId = found.id;
      await admin.auth.admin.updateUserById(found.id, { password });
    } else {
      userId = created.user.id;
    }

    await admin.from("user_roles").insert({ user_id: userId, role: "coach" }).select();

    return json({ ok: true, user_id: userId, email });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

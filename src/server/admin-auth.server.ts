import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireAdminFromAccessToken(accessToken: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user?.id) {
    throw new Error("Unauthorized: please sign in again.");
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) throw new Error(roleError.message);
  if (!role) throw new Error("Forbidden: admin only");

  return data.user;
}
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminFromAccessToken } from "@/server/admin-auth.server";

const MAIN_ADMIN_EMAIL = "tusharraut2001@gmail.com";

// ========== LIST USERS WITH ROLES + STATS ==========
export const listAllUsers = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminFromAccessToken(data.accessToken);

    // Page through auth.users
    const all: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(`listUsers: ${error.message}`);
      data.users.forEach((u) =>
        all.push({
          id: u.id,
          email: u.email ?? (u as any).user_metadata?.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        }),
      );
      if (data.users.length < 200) break;
      page += 1;
      if (page > 50) break; // safety
    }

    const ids = all.map((u) => u.id);
    if (ids.length === 0) return { users: [] };

    const [rolesRes, enrolsRes, progressRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("course_enrollments").select("user_id").in("user_id", ids),
      supabaseAdmin.from("lesson_progress").select("user_id").in("user_id", ids),
    ]);
    if (rolesRes.error) console.error("user_roles error:", rolesRes.error.message);
    if (enrolsRes.error) console.error("enrollments error:", enrolsRes.error.message);
    if (progressRes.error) console.error("progress error:", progressRes.error.message);
    const roles = rolesRes.data ?? [];
    const enrols = enrolsRes.data ?? [];
    const progress = progressRes.data ?? [];

    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
      rolesByUser.get(r.user_id)!.push(r.role as string);
    });
    const enrolCount = new Map<string, number>();
    (enrols ?? []).forEach((e) => enrolCount.set(e.user_id, (enrolCount.get(e.user_id) ?? 0) + 1));
    const progressCount = new Map<string, number>();
    (progress ?? []).forEach((p) =>
      progressCount.set(p.user_id, (progressCount.get(p.user_id) ?? 0) + 1),
    );

    return {
      users: all.map((u) => ({
        ...u,
        roles: rolesByUser.get(u.id) ?? [],
        is_main_admin: u.email === MAIN_ADMIN_EMAIL,
        enrollments: enrolCount.get(u.id) ?? 0,
        completed_lessons: progressCount.get(u.id) ?? 0,
      })),
    };
  });

// ========== USER DETAIL ==========
export const getUserDetail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid(), accessToken: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminFromAccessToken(data.accessToken);
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error) throw new Error(error.message);
    const [{ data: enrols }, { data: progress }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("course_enrollments")
        .select("course_id, payment_status, enrolled_at, courses(title)")
        .eq("user_id", data.userId),
      supabaseAdmin
        .from("lesson_progress")
        .select("lesson_id, course_id, completed_at, course_lessons(title), courses(title)")
        .eq("user_id", data.userId)
        .order("completed_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    return {
      user: u.user,
      enrollments: enrols ?? [],
      progress: progress ?? [],
      roles: (roles ?? []).map((r) => r.role),
    };
  });

// ========== TOGGLE ROLE ==========
export const toggleUserRole = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        role: z.enum(["admin", "coach", "user"]),
        action: z.enum(["add", "remove"]),
        accessToken: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const caller = await requireAdminFromAccessToken(data.accessToken);

    // Caller's email
    const callerEmail = caller.email ?? "";

    // Target's email
    const { data: targetRes } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    const targetEmail = targetRes.user?.email ?? "";

    // Prevent main admin self-demote
    if (
      data.action === "remove" &&
      data.role === "admin" &&
      targetEmail === MAIN_ADMIN_EMAIL
    ) {
      throw new Error("The main admin cannot be demoted.");
    }
    // Also prevent any admin from demoting themselves (safety net)
    if (
      data.action === "remove" &&
      data.role === "admin" &&
      data.targetUserId === caller.id &&
      callerEmail === MAIN_ADMIN_EMAIL
    ) {
      throw new Error("You cannot demote yourself.");
    }

    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.targetUserId, role: data.role })
        .select()
        .maybeSingle();
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ========== DELETE USER ==========
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ targetUserId: z.string().uuid(), accessToken: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const caller = await requireAdminFromAccessToken(data.accessToken);

    const { data: targetRes } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    const targetEmail = targetRes.user?.email ?? "";
    if (targetEmail === MAIN_ADMIN_EMAIL) {
      throw new Error("The main admin account cannot be deleted.");
    }
    if (data.targetUserId === caller.id) {
      throw new Error("You cannot delete your own account here.");
    }

    // Best-effort cleanup of related rows
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("course_enrollments").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("lesson_progress").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("meal_plan_items").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("announcement_dismissals").delete().eq("user_id", data.targetUserId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

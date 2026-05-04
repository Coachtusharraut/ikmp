import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Mail, Bell, Trash2, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  listAllUsers,
  toggleUserRole,
  deleteUser,
} from "@/server/admin.functions";
import { sendNewsletter } from "@/server/newsletter.functions";
import { sendPushToAll } from "@/server/push.functions";

export const Route = createFileRoute("/admin-tools")({
  component: AdminTools,
});

function AdminTools() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<"users" | "newsletter" | "push">("users");

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Back to admin
      </Link>

      <h1 className="font-display text-4xl font-semibold mb-2">Admin tools</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage users, send newsletters, and push notifications to your community.
      </p>

      <div className="flex gap-2 mb-6 border-b">
        {[
          { k: "users", label: "Users", icon: Users },
          { k: "newsletter", label: "Newsletter", icon: Mail },
          { k: "push", label: "Push notifications", icon: Bell },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 " +
                (active
                  ? "border-spice text-spice"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "users" && <UsersPanel />}
      {tab === "newsletter" && <NewsletterPanel />}
      {tab === "push" && <PushPanel />}
    </div>
  );
}

// ============== USERS ==============
function UsersPanel() {
  const list = useServerFn(listAllUsers);
  const toggle = useServerFn(toggleUserRole);
  const del = useServerFn(deleteUser);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin_all_users"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again to load users.");
      return list({ data: { accessToken } });
    },
  });

  const users = (data?.users ?? []).filter((u: any) =>
    !q ? true : u.email?.toLowerCase().includes(q.toLowerCase()),
  );

  async function handleToggle(uid: string, role: "admin" | "coach", has: boolean) {
    setBusy(uid + role);
    try {
      await toggle({ data: { targetUserId: uid, role, action: has ? "remove" : "add" } });
      toast.success("Role updated");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(uid: string, email: string | null) {
    if (!confirm(`Delete ${email}? This permanently removes the user and their data.`)) return;
    setBusy(uid + "del");
    try {
      await del({ data: { targetUserId: uid } });
      toast.success("User deleted");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>All users ({users.length})</CardTitle>
        </div>
        <Input
          placeholder="Search by email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="p-2">Email</th>
                  <th className="p-2 hidden md:table-cell">Joined</th>
                  <th className="p-2 hidden md:table-cell">Activity</th>
                  <th className="p-2">Roles</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u: any) => {
                  const isAdminRole = u.roles.includes("admin");
                  const isCoachRole = u.roles.includes("coach");
                  return (
                    <tr key={u.id} className="hover:bg-accent/20">
                      <td className="p-2 font-medium">
                        {u.email}
                        {u.is_main_admin && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-spice">
                            <Sparkles className="size-3" /> Main
                          </span>
                        )}
                      </td>
                      <td className="p-2 hidden md:table-cell text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 hidden md:table-cell text-muted-foreground text-xs">
                        {u.enrollments} enrolled · {u.completed_lessons} done
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r: string) => (
                            <span
                              key={r}
                              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === u.id + "admin" || u.is_main_admin}
                          onClick={() => handleToggle(u.id, "admin", isAdminRole)}
                          title={u.is_main_admin ? "Main admin cannot be changed" : ""}
                        >
                          {isAdminRole ? (
                            <>
                              <ShieldOff className="size-4 mr-1" /> Demote admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="size-4 mr-1" /> Make admin
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === u.id + "coach"}
                          onClick={() => handleToggle(u.id, "coach", isCoachRole)}
                        >
                          {isCoachRole ? "Remove coach" : "Make coach"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          disabled={u.is_main_admin || busy === u.id + "del"}
                          onClick={() => handleDelete(u.id, u.email)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== NEWSLETTER ==============
function NewsletterPanel() {
  const send = useServerFn(sendNewsletter);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [alsoBanner, setAlsoBanner] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    if (!alsoEmail && !alsoBanner) {
      toast.error("Pick at least one delivery method.");
      return;
    }
    if (!confirm("Send to all users?")) return;
    setBusy(true);
    try {
      const res = await send({
        data: {
          subject,
          bodyHtml: body,
          alsoEmail,
          alsoAnnouncement: alsoBanner,
        },
      });
      toast.success(
        `Sent. ${res.emailSent ? `${res.emailSent} emails.` : ""} ${res.emailNote ?? ""}`.trim(),
      );
      if (res.emailNote) toast.info(res.emailNote);
      setSubject("");
      setBody("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send newsletter</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Posts a banner on the home page for everyone, and (optionally) emails all users.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Subject / title</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5"
            placeholder="What's new this week"
          />
        </div>
        <div>
          <Label>Body (HTML allowed)</Label>
          <Textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 font-mono text-sm"
            placeholder="<p>Hello! This week we added…</p>"
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={alsoBanner}
              onChange={(e) => setAlsoBanner(e.target.checked)}
            />
            Show as in-app banner
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={alsoEmail}
              onChange={(e) => setAlsoEmail(e.target.checked)}
            />
            Also send email
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Note: email delivery requires an email sender domain. If not set up yet, only the
          banner is posted — set up in Cloud → Emails when ready.
        </p>
        <Button
          disabled={busy}
          onClick={submit}
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          {busy ? "Sending…" : "Send to all users"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============== PUSH ==============
function PushPanel() {
  const send = useServerFn(sendPushToAll);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    if (!confirm("Send push notification to all subscribed devices?")) return;
    setBusy(true);
    try {
      const res = await send({ data: { title, body, url } });
      toast.success(`Sent to ${res.sent} of ${res.total} devices${res.failed ? ` (${res.failed} failed)` : ""}.`);
      setTitle("");
      setBody("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send push notification</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Sent to every user who has enabled notifications on their device. Users enable from the
          home page or their profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={120} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5"
            maxLength={500}
          />
        </div>
        <div>
          <Label>Open URL when clicked</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1.5" placeholder="/" />
        </div>
        <Button
          disabled={busy}
          onClick={submit}
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          {busy ? "Sending…" : "Send notification"}
        </Button>
      </CardContent>
    </Card>
  );
}

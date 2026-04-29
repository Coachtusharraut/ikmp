import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Mail } from "lucide-react";

export const Route = createFileRoute("/delete-account")({
  component: DeleteAccountPage,
  head: () => ({
    meta: [
      { title: "Delete Account & Data — Coach Tushar Raut" },
      {
        name: "description",
        content:
          "Request permanent deletion of your account and all associated data from the Coach Tushar Raut app.",
      },
    ],
  }),
});

function DeleteAccountPage() {
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (confirm !== "DELETE") {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Your account and data have been permanently deleted.");
      await signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e.message ?? "Could not delete account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">
        Delete your account & data
      </h1>
      <p className="mt-3 text-muted-foreground">
        This page lets you permanently remove your account and all personal
        data we have stored about you in the Coach Tushar Raut app.
      </p>

      <section className="mt-8 rounded-2xl border bg-card p-6 space-y-3">
        <h2 className="font-display text-xl font-semibold">What gets deleted</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Your account and login credentials (email, password)</li>
          <li>Your profile information</li>
          <li>Your weekly meal plans and grocery lists</li>
          <li>Any recipes, courses or notes you personally created</li>
          <li>Role and permission records associated with your account</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Deletion is immediate and permanent. We retain no backups of personal
          data beyond 30 days for routine system backups, after which all
          residual copies are purged automatically.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Trash2 className="size-5 text-destructive" />
          Option 1 — Delete from inside the app
        </h2>
        {user ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
              <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">
                You are signed in as <strong>{user.email}</strong>. Clicking
                delete below will immediately and permanently remove your
                account and all associated data.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">
                Type <span className="font-mono">DELETE</span> to confirm
              </label>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1.5"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirm !== "DELETE"}
              className="w-full"
            >
              {loading ? "Deleting…" : "Permanently delete my account"}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Please{" "}
            <Link to="/login" className="text-spice underline">
              sign in
            </Link>{" "}
            first to delete your account directly from the app.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Mail className="size-5 text-spice" />
          Option 2 — Request deletion by email
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          If you cannot sign in, email us from the address associated with your
          account and we will verify your identity and delete your data within
          7 days.
        </p>
        <a
          href="mailto:tusharraut2001@gmail.com?subject=Account%20%26%20data%20deletion%20request"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-spice text-spice-foreground px-4 py-2 text-sm font-medium hover:bg-spice/90"
        >
          <Mail className="size-4" /> tusharraut2001@gmail.com
        </a>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Last updated: April 2026 · Coach Tushar Raut — Indian Kitchen Meal Plan
      </p>
    </div>
  );
}

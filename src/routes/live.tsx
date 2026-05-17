import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Video, Plus, Pencil, Trash2, ExternalLink, Calendar, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { Linkify } from "@/lib/linkify";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Sessions — Join upcoming coaching calls" },
      { name: "description", content: "Join scheduled live coaching sessions and Q&A calls." },
      { property: "og:title", content: "Live Sessions" },
      { property: "og:description", content: "Join scheduled live coaching sessions and Q&A calls." },
    ],
  }),
  component: LivePage,
});

type Session = {
  id: string;
  title: string;
  description: string | null;
  join_url: string;
  scheduled_at: string;
  duration_min: number;
  host: string | null;
  is_published: boolean;
};

function LivePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Session> | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["live_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Session[];
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (s: Partial<Session>) => {
      const payload = {
        title: s.title!,
        description: s.description ?? null,
        join_url: s.join_url!,
        scheduled_at: s.scheduled_at!,
        duration_min: Number(s.duration_min) || 60,
        host: s.host ?? null,
        is_published: s.is_published ?? true,
      };
      if (s.id) {
        const { error } = await supabase.from("live_sessions" as any).update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("live_sessions" as any)
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["live_sessions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_sessions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["live_sessions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Video className="size-12 mx-auto text-spice mb-4" />
        <h1 className="font-display text-3xl mb-2">Live Sessions</h1>
        <p className="text-muted-foreground mb-6">Sign in to see scheduled live coaching calls.</p>
        <Button asChild className="bg-spice text-spice-foreground hover:bg-spice/90">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = sessions.filter((s) => new Date(s.scheduled_at).getTime() + s.duration_min * 60_000 >= now);
  const past = sessions.filter((s) => new Date(s.scheduled_at).getTime() + s.duration_min * 60_000 < now);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold flex items-center gap-2">
            <Video className="size-7 text-spice" /> Live Sessions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join live coaching calls, workshops and Q&A sessions.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() =>
              setEditing({
                title: "",
                description: "",
                join_url: "",
                scheduled_at: new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 16),
                duration_min: 60,
                host: "",
                is_published: true,
              })
            }
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            <Plus className="size-4 mr-1" /> New session
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="border rounded-2xl p-10 text-center bg-card">
          <Video className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No live sessions scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled right now.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <SessionCard key={s.id} s={s} isAdmin={isAdmin} onEdit={setEditing} onDelete={(id) => remove.mutate(id)} live />
                ))}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold mb-3 text-muted-foreground">Past</h2>
              <div className="space-y-3">
                {past.map((s) => (
                  <SessionCard key={s.id} s={s} isAdmin={isAdmin} onEdit={setEditing} onDelete={(id) => remove.mutate(id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit session" : "New live session"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1.5"
                  placeholder="Weekly Q&A"
                />
              </div>
              <div>
                <Label>Join link (Zoom / Meet / etc.)</Label>
                <Input
                  value={editing.join_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, join_url: e.target.value })}
                  className="mt-1.5"
                  placeholder="https://zoom.us/j/…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date & time</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(editing.scheduled_at)}
                    onChange={(e) =>
                      setEditing({ ...editing, scheduled_at: new Date(e.target.value).toISOString() })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={editing.duration_min ?? 60}
                    onChange={(e) =>
                      setEditing({ ...editing, duration_min: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>Host (optional)</Label>
                <Input
                  value={editing.host ?? ""}
                  onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                  className="mt-1.5"
                  placeholder="Coach Tushar"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1.5"
                  placeholder="What will you cover?"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? true}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                />
                Visible to users
              </label>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate(editing)}
                disabled={
                  save.isPending ||
                  !editing.title?.trim() ||
                  !editing.join_url?.trim() ||
                  !editing.scheduled_at
                }
                className="bg-spice text-spice-foreground hover:bg-spice/90"
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SessionCard({
  s,
  isAdmin,
  onEdit,
  onDelete,
  live,
}: {
  s: Session;
  isAdmin: boolean;
  onEdit: (s: Session) => void;
  onDelete: (id: string) => void;
  live?: boolean;
}) {
  const dt = new Date(s.scheduled_at);
  const isLiveNow =
    live &&
    Date.now() >= dt.getTime() &&
    Date.now() <= dt.getTime() + s.duration_min * 60_000;
  return (
    <div className="border rounded-2xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold">{s.title}</h3>
            {isLiveNow && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                Live now
              </span>
            )}
            {!s.is_published && isAdmin && (
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-muted">Hidden</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {dt.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {s.duration_min} min
            </span>
            {s.host && (
              <span className="inline-flex items-center gap-1">
                <User className="size-3" /> {s.host}
              </span>
            )}
          </div>
          {s.description && (
            <div className="text-sm text-muted-foreground mt-2">
              <Linkify text={s.description} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Button
            asChild
            size="sm"
            className={
              live
                ? "bg-spice text-spice-foreground hover:bg-spice/90"
                : ""
            }
            variant={live ? "default" : "outline"}
          >
            <a href={s.join_url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4 mr-1" /> {live ? "Join" : "Recording / link"}
            </a>
          </Button>
          {isAdmin && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(s)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${s.title}"?`)) onDelete(s.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

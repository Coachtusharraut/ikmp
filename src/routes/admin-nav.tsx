import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Pencil, Plus, Trash2 } from "lucide-react";
import { ICON_MAP, ICON_NAMES, getIcon, type NavItem, type NavVisibility } from "@/lib/nav";

export const Route = createFileRoute("/admin-nav")({
  component: AdminNavPage,
});

const empty: Partial<NavItem> = {
  label: "",
  href: "/",
  icon: "Circle",
  sort_order: 100,
  visibility: "public",
  is_active: true,
};

function AdminNavPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<NavItem> | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin_nav_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_items" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as NavItem[]) ?? [];
    },
    enabled: !!isAdmin,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin_nav_items"] });
    qc.invalidateQueries({ queryKey: ["nav_items"] });
  };

  const save = useMutation({
    mutationFn: async (row: Partial<NavItem>) => {
      const payload = {
        label: row.label,
        href: row.href,
        icon: row.icon,
        sort_order: row.sort_order,
        visibility: row.visibility,
        is_active: row.is_active,
      };
      if (row.id) {
        const { error } = await supabase
          .from("nav_items" as never)
          .update(payload as never)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("nav_items" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_items" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swapOrder = useMutation({
    mutationFn: async ({ a, b }: { a: NavItem; b: NavItem }) => {
      const { error: e1 } = await supabase
        .from("nav_items" as never)
        .update({ sort_order: b.sort_order } as never)
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("nav_items" as never)
        .update({ sort_order: a.sort_order } as never)
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: NavItem) => {
      const { error } = await supabase
        .from("nav_items" as never)
        .update({ is_active: !row.is_active } as never)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="container mx-auto p-10">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="container mx-auto p-10">
        Admins only. <Link to="/" className="underline">Home</Link>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-1">
            Navigation
          </div>
          <h1 className="font-display text-3xl font-light">Header menu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, reorder or hide items shown in the top navigation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin">← Back to Admin</Link>
          </Button>
          <Button
            className="bg-spice text-spice-foreground hover:bg-spice/90"
            onClick={() => setEditing({ ...empty, sort_order: (items.at(-1)?.sort_order ?? 0) + 10 })}
          >
            <Plus className="size-4 mr-1" /> Add item
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-muted-foreground">No nav items yet.</div>
        ) : (
          <ul className="divide-y">
            {items.map((n, i) => {
              const Icon = getIcon(n.icon);
              const prev = items[i - 1];
              const next = items[i + 1];
              return (
                <li
                  key={n.id}
                  className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div className="size-10 rounded-xl bg-spice/10 text-spice grid place-items-center shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-2">
                      {n.label}
                      {!n.is_active && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border rounded px-1.5 py-0.5">
                          hidden
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {n.href} · {n.visibility}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!prev || swapOrder.isPending}
                      onClick={() => prev && swapOrder.mutate({ a: n, b: prev })}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!next || swapOrder.isPending}
                      onClick={() => next && swapOrder.mutate({ a: n, b: next })}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Switch
                      checked={n.is_active}
                      onCheckedChange={() => toggleActive.mutate(n)}
                      aria-label="Active"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(n)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete "${n.label}"?`)) del.mutate(n.id);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit nav item" : "Add nav item"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={editing.label ?? ""}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Link (href)</Label>
                  <Input
                    value={editing.href ?? ""}
                    placeholder="/recipes"
                    onChange={(e) => setEditing({ ...editing, href: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={editing.visibility ?? "public"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, visibility: v as NavVisibility })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Everyone</SelectItem>
                      <SelectItem value="member">Signed-in members</SelectItem>
                      <SelectItem value="coach">Coaches & admins</SelectItem>
                      <SelectItem value="admin">Admins only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Icon</Label>
                <div className="mt-2 grid grid-cols-8 gap-2 max-h-56 overflow-y-auto p-2 rounded-lg border bg-background">
                  {ICON_NAMES.map((name) => {
                    const I = ICON_MAP[name];
                    const active = editing.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => setEditing({ ...editing, icon: name })}
                        className={
                          "size-10 grid place-items-center rounded-lg border transition " +
                          (active
                            ? "bg-spice text-spice-foreground border-spice"
                            : "hover:bg-accent")
                        }
                      >
                        <I className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Active (show in menu)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              className="bg-spice text-spice-foreground hover:bg-spice/90"
              disabled={save.isPending || !editing?.label || !editing?.href}
              onClick={() => editing && save.mutate(editing)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

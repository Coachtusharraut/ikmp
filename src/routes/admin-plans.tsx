import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Search, ChefHat, Dumbbell, Activity } from "lucide-react";
import { toast } from "sonner";
import { listAllUsers } from "@/server/admin.functions";

export const Route = createFileRoute("/admin-plans")({
  component: AdminPlansPage,
});

type AdminUser = { id: string; email: string | null };
type Item = {
  id: string;
  plan_id: string;
  item_type: "recipe" | "workout";
  item_id: string;
  times_per_week: number;
  servings: number | null;
  notes: string | null;
  sort_order: number;
};

function AdminPlansPage() {
  const { user, isAdmin, loading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const listUsers = useServerFn(listAllUsers);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin_plan_users"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("No session");
      const res = await listUsers({ data: { accessToken: token } });
      return (res.users ?? []) as AdminUser[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => (u.email ?? "").toLowerCase().includes(q));
  }, [users, search]);

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user || !isAdmin)
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Admin access required.
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Back to admin
      </Link>
      <h1 className="font-display text-4xl font-semibold mb-2">Assigned plans</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pick a user to assign their meal + workout plan and view their progress.
      </p>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="size-4" /> Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Search email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-[60vh] overflow-y-auto divide-y -mx-2">
              {usersLoading && <div className="px-2 py-3 text-sm text-muted-foreground">Loading…</div>}
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={
                    "w-full text-left px-2 py-2 text-sm hover:bg-accent rounded " +
                    (selectedUser?.id === u.id ? "bg-accent font-medium" : "")
                  }
                >
                  {u.email ?? u.id.slice(0, 8)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div>
          {selectedUser ? (
            <UserPlanEditor key={selectedUser.id} user={selectedUser} />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a user to manage their plan.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function UserPlanEditor({ user }: { user: AdminUser }) {
  const qc = useQueryClient();

  // get or create plan
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["admin_user_plan", user.id],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return existing;
      const { data: created, error } = await supabase
        .from("user_plans")
        .insert({ user_id: user.id, name: "My Plan" })
        .select("*")
        .single();
      if (error) throw error;
      return created;
    },
  });

  const planId = plan?.id;

  const { data: items = [] } = useQuery({
    queryKey: ["admin_user_plan_items", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_plan_items")
        .select("*")
        .eq("plan_id", planId!)
        .order("sort_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["all_recipes_min"],
    queryFn: async () => {
      const { data } = await supabase.from("recipes").select("id,name,image_url").order("name");
      return data ?? [];
    },
  });
  const { data: workouts = [] } = useQuery({
    queryKey: ["all_workouts_min"],
    queryFn: async () => {
      const { data } = await supabase.from("workouts").select("id,name,image_url").order("name");
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (payload: { item_type: "recipe" | "workout"; item_id: string }) => {
      const { error } = await supabase.from("user_plan_items").insert({
        plan_id: planId!,
        item_type: payload.item_type,
        item_id: payload.item_id,
        times_per_week: 1,
        servings: payload.item_type === "recipe" ? 2 : null,
        sort_order: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_user_plan_items", planId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const { error } = await supabase.from("user_plan_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_user_plan_items", planId] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_user_plan_items", planId] }),
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase.from("user_plans").update({ notes }).eq("id", planId!);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Saved"),
  });

  // tracking
  const { data: completions = [] } = useQuery({
    queryKey: ["admin_user_completions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_item_completions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["admin_user_checkins", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["admin_user_overrides", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_plan_user_items")
        .select("*")
        .eq("plan_id", planId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recipeMap = useMemo(() => new Map(recipes.map((r: any) => [r.id, r])), [recipes]);
  const workoutMap = useMemo(() => new Map(workouts.map((w: any) => [w.id, w])), [workouts]);

  function nameOf(t: string, id: string) {
    if (t === "recipe") return (recipeMap.get(id) as any)?.name ?? "Recipe";
    return (workoutMap.get(id) as any)?.name ?? "Workout";
  }

  if (planLoading || !plan) return <div className="text-muted-foreground">Loading plan…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{user.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Coach notes for this user</Label>
            <Textarea
              defaultValue={plan.notes ?? ""}
              onBlur={(e) => updateNotes.mutate(e.target.value)}
              placeholder="Goals, allergies, focus areas…"
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ChefHat className="size-4" /> Meals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AddPicker
            label="Add recipe"
            options={recipes}
            onPick={(id) => addItem.mutate({ item_type: "recipe", item_id: id })}
          />
          {items.filter((i) => i.item_type === "recipe").map((i) => (
            <ItemRow
              key={i.id}
              name={nameOf("recipe", i.item_id)}
              image={(recipeMap.get(i.item_id) as any)?.image_url}
              item={i}
              showServings
              onChange={(patch) => updateItem.mutate({ id: i.id, patch })}
              onRemove={() => removeItem.mutate(i.id)}
            />
          ))}
          {items.filter((i) => i.item_type === "recipe").length === 0 && (
            <div className="text-sm text-muted-foreground">No recipes assigned yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="size-4" /> Workouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AddPicker
            label="Add workout"
            options={workouts}
            onPick={(id) => addItem.mutate({ item_type: "workout", item_id: id })}
          />
          {items.filter((i) => i.item_type === "workout").map((i) => (
            <ItemRow
              key={i.id}
              name={nameOf("workout", i.item_id)}
              image={(workoutMap.get(i.item_id) as any)?.image_url}
              item={i}
              onChange={(patch) => updateItem.mutate({ id: i.id, patch })}
              onRemove={() => removeItem.mutate(i.id)}
            />
          ))}
          {items.filter((i) => i.item_type === "workout").length === 0 && (
            <div className="text-sm text-muted-foreground">No workouts assigned yet.</div>
          )}
        </CardContent>
      </Card>

      {overrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User has personal overrides ({overrides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {overrides.map((o: any) => (
                <li key={o.id} className="flex justify-between">
                  <span>
                    <span className="text-muted-foreground capitalize mr-2">{o.item_type}</span>
                    {nameOf(o.item_type, o.item_id)}
                  </span>
                  <span className="text-muted-foreground">×{o.times_per_week}/wk</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" /> Recent completions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No completions yet.</div>
          ) : (
            <ul className="text-sm divide-y">
              {completions.map((c: any) => (
                <li key={c.id} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-muted-foreground capitalize text-xs mr-2">{c.item_type}</span>
                    <span className="font-medium">{nameOf(c.item_type, c.item_id)}</span>
                    {c.note && <div className="text-xs text-muted-foreground mt-0.5">“{c.note}”</div>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.completed_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Body check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <div className="text-sm text-muted-foreground">No check-ins yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Weight (kg)</th>
                  <th>Waist</th>
                  <th>Body fat %</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {checkins.map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-1.5">{c.measured_at}</td>
                    <td>{c.weight_kg ?? "—"}</td>
                    <td>{c.waist_cm ?? "—"}</td>
                    <td>{c.body_fat_pct ?? "—"}</td>
                    <td className="text-muted-foreground">{c.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddPicker({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 border rounded-md h-9 px-2 bg-background text-sm"
      >
        <option value="">— {label} —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={() => {
          if (val) {
            onPick(val);
            setVal("");
          }
        }}
        disabled={!val}
        className="bg-spice text-spice-foreground hover:bg-spice/90"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function ItemRow({
  name,
  image,
  item,
  showServings,
  onChange,
  onRemove,
}: {
  name: string;
  image?: string | null;
  item: Item;
  showServings?: boolean;
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border rounded-lg p-2">
      <div className="size-12 rounded-md overflow-hidden bg-muted shrink-0">
        {image && <img src={image} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">×/wk</label>
          <Input
            type="number"
            min={1}
            value={item.times_per_week}
            onChange={(e) =>
              onChange({ times_per_week: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="h-8 w-16 text-center"
          />
        </div>
        {showServings && (
          <div className="flex flex-col items-center">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Serv</label>
            <Input
              type="number"
              min={1}
              value={item.servings ?? 1}
              onChange={(e) =>
                onChange({ servings: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className="h-8 w-16 text-center"
            />
          </div>
        )}
        <Button size="icon" variant="ghost" onClick={onRemove} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Dumbbell, Plus, Trash2, RotateCcw, Check, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/my-plan")({
  component: MyPlanPage,
});

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

function MyPlanPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["my_plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: assigned = [] } = useQuery({
    queryKey: ["my_plan_assigned", plan?.id],
    enabled: !!plan?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plan_items")
        .select("*")
        .eq("plan_id", plan!.id)
        .order("sort_order");
      return (data ?? []) as Item[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["my_plan_overrides", plan?.id],
    enabled: !!plan?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plan_user_items")
        .select("*")
        .eq("plan_id", plan!.id)
        .order("sort_order");
      return (data ?? []) as Item[];
    },
  });

  const usingOverride = overrides.length > 0;
  const visible = usingOverride ? overrides : assigned;

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes_min_for_plan"],
    queryFn: async () => {
      const { data } = await supabase.from("recipes").select("id,name,image_url").order("name");
      return data ?? [];
    },
  });
  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts_min_for_plan"],
    queryFn: async () => {
      const { data } = await supabase.from("workouts").select("id,name,image_url").order("name");
      return data ?? [];
    },
  });

  const recipeMap = useMemo(() => new Map(recipes.map((r: any) => [r.id, r])), [recipes]);
  const workoutMap = useMemo(() => new Map(workouts.map((w: any) => [w.id, w])), [workouts]);

  const startEditing = useMutation({
    mutationFn: async () => {
      // copy assigned -> override rows
      if (overrides.length > 0) return;
      const rows = assigned.map((a) => ({
        plan_id: plan!.id,
        item_type: a.item_type,
        item_id: a.item_id,
        times_per_week: a.times_per_week,
        servings: a.servings,
        notes: a.notes,
        sort_order: a.sort_order,
      }));
      if (rows.length === 0) {
        // ensure non-empty so override mode activates
        rows.push({
          plan_id: plan!.id,
          item_type: "recipe" as const,
          item_id: recipes[0]?.id ?? "",
          times_per_week: 1,
          servings: 1,
          notes: null,
          sort_order: 0,
        } as any);
      }
      const real = rows.filter((r) => r.item_id);
      if (real.length === 0) throw new Error("No items to copy");
      const { error } = await supabase.from("user_plan_user_items").insert(real);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_plan_overrides", plan?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resetOverride = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("user_plan_user_items")
        .delete()
        .eq("plan_id", plan!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reset to coach's plan");
      qc.invalidateQueries({ queryKey: ["my_plan_overrides", plan?.id] });
    },
  });

  const addOverride = useMutation({
    mutationFn: async (payload: { item_type: "recipe" | "workout"; item_id: string }) => {
      const { error } = await supabase.from("user_plan_user_items").insert({
        plan_id: plan!.id,
        item_type: payload.item_type,
        item_id: payload.item_id,
        times_per_week: 1,
        servings: payload.item_type === "recipe" ? 2 : null,
        sort_order: overrides.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_plan_overrides", plan?.id] }),
  });

  const updateOverride = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const { error } = await supabase.from("user_plan_user_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_plan_overrides", plan?.id] }),
  });

  const removeOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_plan_user_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_plan_overrides", plan?.id] }),
  });

  function nameOf(t: string, id: string) {
    return t === "recipe"
      ? ((recipeMap.get(id) as any)?.name ?? "Recipe")
      : ((workoutMap.get(id) as any)?.name ?? "Workout");
  }
  function imgOf(t: string, id: string) {
    return t === "recipe"
      ? (recipeMap.get(id) as any)?.image_url
      : (workoutMap.get(id) as any)?.image_url;
  }

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">Sign in to view your plan</Link>
      </div>
    );
  if (planLoading) return <div className="container mx-auto px-4 py-16">Loading plan…</div>;
  if (!plan)
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Your coach hasn't assigned you a plan yet.
      </div>
    );

  const meals = visible.filter((i) => i.item_type === "recipe");
  const workoutsItems = visible.filter((i) => i.item_type === "workout");

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">My Plan</div>
          <h1 className="font-display text-4xl font-semibold">{plan.name}</h1>
          {plan.notes && (
            <p className="text-sm text-muted-foreground mt-2 max-w-prose whitespace-pre-wrap">
              {plan.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {usingOverride ? (
            <Button variant="outline" size="sm" onClick={() => resetOverride.mutate()}>
              <RotateCcw className="size-4 mr-2" /> Reset to coach's plan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditing.mutate()}
              disabled={assigned.length === 0}
            >
              Customise my plan
            </Button>
          )}
        </div>
      </div>

      {usingOverride && (
        <div className="text-xs text-muted-foreground bg-accent/40 border rounded-md px-3 py-2">
          You're viewing your personal version. Your coach's original plan is saved and you can reset anytime.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ChefHat className="size-4" /> Meals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meals.length === 0 && (
            <div className="text-sm text-muted-foreground">No meals in this plan.</div>
          )}
          {meals.map((i) => (
            <PlanRow
              key={i.id}
              name={nameOf(i.item_type, i.item_id)}
              image={imgOf(i.item_type, i.item_id)}
              item={i}
              userId={user.id}
              showServings
              editable={usingOverride}
              link={{ to: "/recipe/$id", params: { id: i.item_id } }}
              onChange={(patch) => updateOverride.mutate({ id: i.id, patch })}
              onRemove={() => removeOverride.mutate(i.id)}
            />
          ))}
          {usingOverride && (
            <AddPicker
              label="Add recipe"
              options={recipes}
              onPick={(id) => addOverride.mutate({ item_type: "recipe", item_id: id })}
            />
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
          {workoutsItems.length === 0 && (
            <div className="text-sm text-muted-foreground">No workouts in this plan.</div>
          )}
          {workoutsItems.map((i) => (
            <PlanRow
              key={i.id}
              name={nameOf(i.item_type, i.item_id)}
              image={imgOf(i.item_type, i.item_id)}
              item={i}
              userId={user.id}
              editable={usingOverride}
              link={{ to: "/workout/$id", params: { id: i.item_id } }}
              onChange={(patch) => updateOverride.mutate({ id: i.id, patch })}
              onRemove={() => removeOverride.mutate(i.id)}
            />
          ))}
          {usingOverride && (
            <AddPicker
              label="Add workout"
              options={workouts}
              onPick={(id) => addOverride.mutate({ item_type: "workout", item_id: id })}
            />
          )}
        </CardContent>
      </Card>

      <CheckInsCard userId={user.id} />
    </div>
  );
}

function PlanRow({
  name,
  image,
  item,
  userId,
  editable,
  showServings,
  link,
  onChange,
  onRemove,
}: {
  name: string;
  image?: string | null;
  item: Item;
  userId: string;
  editable: boolean;
  showServings?: boolean;
  link: any;
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
}) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("plan_item_completions").insert({
        user_id: userId,
        item_type: item.item_type,
        item_id: item.item_id,
        note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked done");
      setNote("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my_completions", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Link {...link} className="size-14 rounded-md overflow-hidden bg-muted shrink-0">
          {image && <img src={image} alt="" className="w-full h-full object-cover" />}
        </Link>
        <div className="flex-1 min-w-0">
          <Link {...link} className="font-medium text-sm truncate hover:text-spice block">
            {name}
          </Link>
          <div className="text-xs text-muted-foreground">
            {item.times_per_week}× per week
            {showServings && item.servings ? ` · ${item.servings} serving${item.servings > 1 ? "s" : ""}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Input
                type="number"
                min={1}
                value={item.times_per_week}
                onChange={(e) =>
                  onChange({ times_per_week: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="h-8 w-14 text-center"
              />
              {showServings && (
                <Input
                  type="number"
                  min={1}
                  value={item.servings ?? 1}
                  onChange={(e) =>
                    onChange({ servings: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="h-8 w-14 text-center"
                />
              )}
              <Button size="icon" variant="ghost" onClick={onRemove} className="text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            <Check className="size-4 mr-1" /> Done
          </Button>
        </div>
      </div>
      {open && (
        <div className="flex gap-2 pl-[68px]">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it go? (optional note)"
            className="h-8"
          />
          <Button size="sm" onClick={() => complete.mutate()} className="bg-spice text-spice-foreground hover:bg-spice/90">
            Log
          </Button>
        </div>
      )}
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
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={() => { if (val) { onPick(val); setVal(""); } }}
        disabled={!val}
        className="bg-spice text-spice-foreground hover:bg-spice/90"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function CheckInsCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    weight_kg: "",
    waist_cm: "",
    body_fat_pct: "",
    note: "",
  });

  const { data: list = [] } = useQuery({
    queryKey: ["my_checkins", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("measured_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const payload: any = { user_id: userId, note: form.note || null };
      if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg);
      if (form.waist_cm) payload.waist_cm = parseFloat(form.waist_cm);
      if (form.body_fat_pct) payload.body_fat_pct = parseFloat(form.body_fat_pct);
      const { error } = await supabase.from("user_checkins").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in saved");
      setForm({ weight_kg: "", waist_cm: "", body_fat_pct: "", note: "" });
      qc.invalidateQueries({ queryKey: ["my_checkins", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="size-4" /> Body check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Waist (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.waist_cm}
              onChange={(e) => setForm((f) => ({ ...f, waist_cm: e.target.value }))}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Body fat %</Label>
            <Input
              type="number"
              step="0.1"
              value={form.body_fat_pct}
              onChange={(e) => setForm((f) => ({ ...f, body_fat_pct: e.target.value }))}
              className="mt-1 h-9"
            />
          </div>
          <div className="sm:col-span-1 col-span-2">
            <Label className="text-xs">Note</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="mt-1 h-9"
            />
          </div>
        </div>
        <Button onClick={() => add.mutate()} className="bg-spice text-spice-foreground hover:bg-spice/90">
          Log check-in
        </Button>

        {list.length > 0 && (
          <div className="border-t pt-3">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Weight</th>
                  <th>Waist</th>
                  <th>BF%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-1.5">{c.measured_at}</td>
                    <td>{c.weight_kg ?? "—"}</td>
                    <td>{c.waist_cm ?? "—"}</td>
                    <td>{c.body_fat_pct ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

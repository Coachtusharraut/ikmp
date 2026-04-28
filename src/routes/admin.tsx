import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, ShieldCheck, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import type { Recipe, Ingredient } from "@/lib/types";

type Section = { id: string; name: string; description: string | null; sort_order: number };

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const empty: Partial<Recipe> = {
  name: "",
  description: "",
  category: "Main Course",
  cuisine: "Indian",
  image_url: "",
  prep_time_min: 10,
  cook_time_min: 20,
  default_servings: 4,
  instructions: "",
  ingredients: [],
  is_global: true,
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["admin_recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!isAdmin,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Section[];
    },
    enabled: !!isAdmin,
  });

  const save = useMutation({
    mutationFn: async (r: Partial<Recipe>) => {
      const payload = {
        name: r.name!,
        description: r.description ?? null,
        category: r.category ?? "Main Course",
        cuisine: r.cuisine ?? "Indian",
        image_url: r.image_url || null,
        prep_time_min: Number(r.prep_time_min) || 0,
        cook_time_min: Number(r.cook_time_min) || 0,
        default_servings: Number(r.default_servings) || 4,
        instructions: r.instructions ?? null,
        ingredients: (r.ingredients ?? []) as any,
        is_global: true,
      };
      if (r.id) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recipes")
          .insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Recipe saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin_recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in
        </Link>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 space-y-12">
      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-1">
              <ShieldCheck className="size-3.5" /> Admin
            </div>
            <h1 className="font-display text-4xl font-semibold">Manage sections</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create categories like Veg, Non-Veg or Quick Smoothies. Recipes are organised by section.
            </p>
          </div>
        </div>
        <SectionsManager sections={sections} />
      </div>

      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <h2 className="font-display text-3xl font-semibold">Manage recipes</h2>
          <Button
            onClick={() => setEditing({ ...empty, category: sections[0]?.name ?? "Veg" })}
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            <Plus className="size-4 mr-2" /> New recipe
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 w-16"></th>
                  <th className="p-3">Name</th>
                  <th className="p-3 hidden sm:table-cell">Section</th>
                  <th className="p-3 hidden md:table-cell">Time</th>
                  <th className="p-3 hidden md:table-cell">Servings</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recipes.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/20">
                    <td className="p-2">
                      <div className="size-12 rounded-lg overflow-hidden bg-muted">
                        {r.image_url && (
                          <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{r.category}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {r.prep_time_min + r.cook_time_min} min
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {r.default_servings}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${r.name}"?`)) remove.mutate(r.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecipeEditorDialog
        value={editing}
        sections={sections}
        onClose={() => setEditing(null)}
        onSave={(r) => save.mutate(r)}
        saving={save.isPending}
      />
    </div>
  );
}

function RecipeEditorDialog({
  value,
  sections,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Recipe> | null;
  sections: Section[];
  onClose: () => void;
  onSave: (r: Partial<Recipe>) => void;
  saving: boolean;
}) {
  const [r, setR] = useState<Partial<Recipe>>(value ?? {});
  // Sync when value changes
  useStateSync(value, setR);

  if (!value) return null;
  const ingredients = (r.ingredients ?? []) as Ingredient[];

  function update<K extends keyof Recipe>(k: K, v: Recipe[K]) {
    setR((prev) => ({ ...prev, [k]: v }));
  }

  function updateIng(i: number, patch: Partial<Ingredient>) {
    const next = [...ingredients];
    next[i] = { ...next[i], ...patch };
    update("ingredients", next as any);
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r.id ? "Edit recipe" : "New recipe"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={r.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={r.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Section</Label>
              <Select
                value={r.category ?? ""}
                onValueChange={(v) => update("category", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {r.category && !sections.find((s) => s.name === r.category) && (
                    <SelectItem value={r.category}>{r.category} (legacy)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cuisine</Label>
              <Input
                value={r.cuisine ?? ""}
                onChange={(e) => update("cuisine", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Image URL</Label>
            <Input
              value={r.image_url ?? ""}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="https://…"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Prep (min)</Label>
              <Input
                type="number"
                value={r.prep_time_min ?? 0}
                onChange={(e) => update("prep_time_min", parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Cook (min)</Label>
              <Input
                type="number"
                value={r.cook_time_min ?? 0}
                onChange={(e) => update("cook_time_min", parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Servings</Label>
              <Input
                type="number"
                value={r.default_servings ?? 4}
                onChange={(e) => update("default_servings", parseInt(e.target.value) || 1)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea
              rows={6}
              value={r.instructions ?? ""}
              onChange={(e) => update("instructions", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ingredients</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  update("ingredients", [
                    ...ingredients,
                    { name: "", qty: 1, unit: "g" },
                  ] as any)
                }
              >
                <Plus className="size-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-6"
                    placeholder="Name"
                    value={ing.name}
                    onChange={(e) => updateIng(i, { name: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={ing.qty}
                    onChange={(e) => updateIng(i, { qty: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Unit"
                    value={ing.unit}
                    onChange={(e) => updateIng(i, { unit: e.target.value })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1 text-destructive"
                    onClick={() =>
                      update(
                        "ingredients",
                        ingredients.filter((_, j) => j !== i) as any
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !r.name?.trim()}
            onClick={() => onSave(r)}
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sync helper
import { useEffect } from "react";
function useStateSync<T>(value: T | null, setter: (v: T) => void) {
  useEffect(() => {
    if (value) setter(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

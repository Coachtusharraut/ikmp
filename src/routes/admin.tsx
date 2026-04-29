import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Pencil, Plus, Trash2, ShieldCheck, FolderPlus, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Recipe, Ingredient } from "@/lib/types";
import { CourseLessonsEditor } from "@/components/CourseLessonsEditor";

type Section = { id: string; name: string; description: string | null; sort_order: number };
type RecipeSectionLink = { recipe_id: string; section_id: string };

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
  const [editingSectionIds, setEditingSectionIds] = useState<string[]>([]);

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

  const { data: links = [] } = useQuery({
    queryKey: ["admin_recipe_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_sections")
        .select("recipe_id,section_id");
      if (error) throw error;
      return data as RecipeSectionLink[];
    },
    enabled: !!isAdmin,
  });

  function openEditor(r: Partial<Recipe> | null) {
    if (r?.id) {
      const ids = links.filter((l) => l.recipe_id === r.id).map((l) => l.section_id);
      setEditingSectionIds(ids);
    } else {
      setEditingSectionIds(sections.length ? [sections[0].id] : []);
    }
    setEditing(r);
  }

  const save = useMutation({
    mutationFn: async ({ r, sectionIds }: { r: Partial<Recipe>; sectionIds: string[] }) => {
      const primarySectionName =
        sections.find((s) => s.id === sectionIds[0])?.name ?? r.category ?? "Main Course";
      const payload = {
        name: r.name!,
        description: r.description ?? null,
        category: primarySectionName,
        cuisine: r.cuisine ?? "Indian",
        image_url: r.image_url || null,
        prep_time_min: Number(r.prep_time_min) || 0,
        cook_time_min: Number(r.cook_time_min) || 0,
        default_servings: Number(r.default_servings) || 4,
        instructions: r.instructions ?? null,
        ingredients: (r.ingredients ?? []) as any,
        video_url: (r as any).video_url || null,
        video_type: ((r as any).video_type as string) || "youtube",
        is_global: true,
      };
      let recipeId = r.id;
      if (recipeId) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", recipeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("recipes")
          .insert({ ...payload, created_by: user!.id })
          .select("id")
          .single();
        if (error) throw error;
        recipeId = data.id;
      }
      // Sync sections: replace all links for this recipe
      await supabase.from("recipe_sections").delete().eq("recipe_id", recipeId!);
      if (sectionIds.length) {
        const rows = sectionIds.map((sid) => ({ recipe_id: recipeId!, section_id: sid }));
        const { error } = await supabase.from("recipe_sections").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Recipe saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_recipes"] });
      qc.invalidateQueries({ queryKey: ["admin_recipe_sections"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["recipe_sections"] });
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
      {/* Site settings */}
      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-1">
              <Palette className="size-3.5" /> Branding
            </div>
            <h1 className="font-display text-4xl font-semibold">Site settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customise the name, tagline, hero copy, logo, favicon and theme colours — applied across the entire site.
            </p>
          </div>
        </div>
        <SiteSettingsManager />
      </div>

      {/* Coaches */}
      <CoachesManager />

      {/* Delete requests */}
      <DeleteRequestsManager />

      {/* Courses */}
      <CoursesManager />

      {/* Sections */}
      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-1">
              <ShieldCheck className="size-3.5" /> Admin
            </div>
            <h2 className="font-display text-3xl font-semibold">Manage sections</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recipes can belong to multiple sections (e.g. Veg + Quick Smoothies).
            </p>
          </div>
        </div>
        <SectionsManager sections={sections} />
      </div>

      {/* Recipes */}
      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <h2 className="font-display text-3xl font-semibold">Manage recipes</h2>
          <Button
            onClick={() => openEditor(empty)}
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
                  <th className="p-3 hidden sm:table-cell">Sections</th>
                  <th className="p-3 hidden md:table-cell">Time</th>
                  <th className="p-3 hidden md:table-cell">Servings</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recipes.map((r) => {
                  const recipeSectionNames = links
                    .filter((l) => l.recipe_id === r.id)
                    .map((l) => sections.find((s) => s.id === l.section_id)?.name)
                    .filter(Boolean) as string[];
                  return (
                    <tr key={r.id} className="hover:bg-accent/20">
                      <td className="p-2">
                        <div className="size-12 rounded-lg overflow-hidden bg-muted">
                          {r.image_url && (
                            <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">
                        {recipeSectionNames.length ? recipeSectionNames.join(", ") : r.category}
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">
                        {r.prep_time_min + r.cook_time_min} min
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">
                        {r.default_servings}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEditor(r)}>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecipeEditorDialog
        value={editing}
        sections={sections}
        selectedSectionIds={editingSectionIds}
        setSelectedSectionIds={setEditingSectionIds}
        onClose={() => setEditing(null)}
        onSave={(r) => save.mutate({ r, sectionIds: editingSectionIds })}
        saving={save.isPending}
      />
    </div>
  );
}

/* ─────────────────────────── Recipe editor ─────────────────────────── */

function RecipeEditorDialog({
  value,
  sections,
  selectedSectionIds,
  setSelectedSectionIds,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Recipe> | null;
  sections: Section[];
  selectedSectionIds: string[];
  setSelectedSectionIds: (ids: string[]) => void;
  onClose: () => void;
  onSave: (r: Partial<Recipe>) => void;
  saving: boolean;
}) {
  const [r, setR] = useState<Partial<Recipe>>(value ?? {});
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

  function toggleSection(id: string) {
    setSelectedSectionIds(
      selectedSectionIds.includes(id)
        ? selectedSectionIds.filter((x) => x !== id)
        : [...selectedSectionIds, id]
    );
  }

  async function uploadImage(file: File) {
    const ext = file.name.split(".").pop();
    const path = `recipes/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    update("image_url", data.publicUrl);
    toast.success("Image uploaded");
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
            <Input value={r.name ?? ""} onChange={(e) => update("name", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={r.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Sections (pick one or more)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {sections.map((s) => {
                const active = selectedSectionIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    className={
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition " +
                      (active
                        ? "bg-spice text-spice-foreground border-spice"
                        : "bg-card text-muted-foreground hover:text-foreground")
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
              {sections.length === 0 && (
                <p className="text-xs text-muted-foreground">Create a section first.</p>
              )}
            </div>
          </div>

          <div>
            <Label>Cuisine</Label>
            <Input
              value={r.cuisine ?? ""}
              onChange={(e) => update("cuisine", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Image</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={r.image_url ?? ""}
                onChange={(e) => update("image_url", e.target.value)}
                placeholder="Paste URL or upload →"
              />
              <label className="inline-flex items-center gap-1 px-3 rounded-md border bg-card cursor-pointer hover:bg-accent text-sm">
                <Upload className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
              </label>
            </div>
            {r.image_url && (
              <img src={r.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Video type</Label>
              <select
                className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                value={(r as any).video_type ?? "youtube"}
                onChange={(e) => update("video_type" as any, e.target.value as any)}
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Upload (URL)</option>
              </select>
            </div>
            <div>
              <Label>Video URL (optional)</Label>
              <Input
                value={(r as any).video_url ?? ""}
                onChange={(e) => update("video_url" as any, e.target.value as any)}
                className="mt-1.5"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
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
                  update("ingredients", [...ingredients, { name: "", qty: 1, unit: "g" }] as any)
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
                      update("ingredients", ingredients.filter((_, j) => j !== i) as any)
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

function useStateSync<T>(value: T | null, setter: (v: T) => void) {
  useEffect(() => {
    if (value) setter(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

/* ─────────────────────────── Sections manager ─────────────────────────── */

function SectionsManager({ sections }: { sections: Section[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const addSection = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const nextOrder = (sections.at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase
        .from("sections")
        .insert({ name: trimmed, description: description.trim() || null, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section added");
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["admin_sections"] });
      qc.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section deleted");
      qc.invalidateQueries({ queryKey: ["admin_sections"] });
      qc.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
        <div>
          <Label>New section name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. High-Protein"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary"
            className="mt-1.5"
          />
        </div>
        <Button
          onClick={() => addSection.mutate()}
          disabled={addSection.isPending || !name.trim()}
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <FolderPlus className="size-4 mr-2" /> Add section
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">No sections yet — add your first one above.</p>
        )}
        {sections.map((s) => (
          <div
            key={s.id}
            className="group inline-flex items-center gap-2 bg-muted/40 border rounded-full pl-3 pr-1 py-1 text-sm"
          >
            <span className="font-medium">{s.name}</span>
            {s.description && (
              <span className="text-muted-foreground hidden sm:inline">· {s.description}</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-destructive opacity-60 group-hover:opacity-100"
              onClick={() => {
                if (confirm(`Delete section "${s.name}"? Recipes stay but lose this label.`))
                  removeSection.mutate(s.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Site settings manager ─────────────────────────── */

type SiteSettingsRow = {
  id: string;
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  meta_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  spice_color: string;
  background_color: string;
  foreground_color: string;
  accent_color: string;
  font_display: string;
  font_body: string;
};

function SiteSettingsManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin_site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SiteSettingsRow;
    },
  });
  const [s, setS] = useState<SiteSettingsRow | null>(null);
  useEffect(() => {
    if (data) setS(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: SiteSettingsRow) => {
      const { id, ...patch } = next;
      const { error } = await supabase.from("site_settings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin_site_settings"] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function uploadAsset(file: File, prefix: "logo" | "favicon"): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return data.publicUrl;
  }

  if (isLoading || !s) return <div className="text-muted-foreground">Loading settings…</div>;

  function up<K extends keyof SiteSettingsRow>(k: K, v: SiteSettingsRow[K]) {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label>Site name</Label>
          <Input value={s.site_name} onChange={(e) => up("site_name", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Tagline</Label>
          <Input value={s.tagline} onChange={(e) => up("tagline", e.target.value)} className="mt-1.5" />
        </div>
        <div className="md:col-span-2">
          <Label>Hero title</Label>
          <Input value={s.hero_title} onChange={(e) => up("hero_title", e.target.value)} className="mt-1.5" />
        </div>
        <div className="md:col-span-2">
          <Label>Hero subtitle</Label>
          <Textarea
            value={s.hero_subtitle}
            onChange={(e) => up("hero_subtitle", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="md:col-span-2">
          <Label>SEO meta description</Label>
          <Textarea
            value={s.meta_description}
            onChange={(e) => up("meta_description", e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Logo + favicon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AssetField
          label="Logo"
          url={s.logo_url}
          onChangeUrl={(v) => up("logo_url", v)}
          onUpload={(f) => uploadAsset(f, "logo").then((url) => url && up("logo_url", url))}
        />
        <AssetField
          label="Favicon"
          url={s.favicon_url}
          onChangeUrl={(v) => up("favicon_url", v)}
          onUpload={(f) => uploadAsset(f, "favicon").then((url) => url && up("favicon_url", url))}
        />
      </div>

      {/* Theme colours */}
      <div>
        <Label className="mb-2 block">Theme colours (oklch values)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColorField label="Background" value={s.background_color} onChange={(v) => up("background_color", v)} />
          <ColorField label="Foreground" value={s.foreground_color} onChange={(v) => up("foreground_color", v)} />
          <ColorField label="Primary" value={s.primary_color} onChange={(v) => up("primary_color", v)} />
          <ColorField label="Spice (accent)" value={s.spice_color} onChange={(v) => up("spice_color", v)} />
          <ColorField label="Accent" value={s.accent_color} onChange={(v) => up("accent_color", v)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          onClick={() => save.mutate(s)}
          disabled={save.isPending}
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          {save.isPending ? "Saving…" : "Save site settings"}
        </Button>
      </div>
    </div>
  );
}

function AssetField({
  label,
  url,
  onChangeUrl,
  onUpload,
}: {
  label: string;
  url: string | null;
  onChangeUrl: (v: string | null) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1.5">
        <Input
          value={url ?? ""}
          onChange={(e) => onChangeUrl(e.target.value || null)}
          placeholder="Paste URL or upload →"
        />
        <label className="inline-flex items-center gap-1 px-3 rounded-md border bg-card cursor-pointer hover:bg-accent text-sm">
          <Upload className="size-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>
      {url && (
        <img src={url} alt={label} className="mt-2 h-16 w-16 rounded-lg object-cover bg-muted" />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5 flex items-center gap-2">
        <div
          className="size-9 rounded-md border shrink-0"
          style={{ background: value }}
          aria-hidden
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

/* ─────────────── Coaches Manager ─────────────── */
type CoachRow = {
  id: string;
  user_id: string;
  role: string;
  email: string;
  created_at: string;
};

function CoachesManager() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetFor, setResetFor] = useState<CoachRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: coaches = [] } = useQuery({
    queryKey: ["admin_coaches"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-coach", {
        body: { action: "list" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return ((data as any)?.coaches ?? []) as CoachRow[];
    },
  });

  const createCoach = useMutation({
    mutationFn: async () => {
      const e = email.trim().toLowerCase();
      if (!e || !password || password.length < 8) {
        throw new Error("Email and password (min 8 chars) required");
      }
      const { data, error } = await supabase.functions.invoke("admin-create-coach", {
        body: { action: "create", email: e, password },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Coach created. Share the credentials with them.");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admin_coaches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePassword = useMutation({
    mutationFn: async ({ user_id, pwd }: { user_id: string; pwd: string }) => {
      if (!pwd || pwd.length < 8) throw new Error("Password must be at least 8 characters");
      const { data, error } = await supabase.functions.invoke("admin-create-coach", {
        body: { action: "update_password", user_id, password: pwd },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast.success("Password updated. Share the new password with the coach.");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const demote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin_coaches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function makePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold mb-2">Coaches</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Create a coach account by entering their email and a password. Share the credentials —
        they sign in at the login page and can then add recipes & courses.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="coach@example.com"
        />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
        />
        <Button type="button" variant="outline" onClick={() => setPassword(makePassword())}>
          Generate
        </Button>
        <Button
          onClick={() => createCoach.mutate()}
          disabled={createCoach.isPending || !email || password.length < 8}
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <Plus className="size-4 mr-1" /> Create coach
        </Button>
      </div>
      <div className="bg-card border rounded-2xl divide-y">
        {coaches.map((c) => (
          <div key={c.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.email || <span className="text-muted-foreground italic">unknown email</span>}</div>
              <div className="text-xs text-muted-foreground font-mono truncate">{c.user_id}</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent">{c.role}</span>
            {c.role === "coach" && (
              <>
                <Button size="sm" variant="outline" onClick={() => { setResetFor(c); setNewPassword(makePassword()); }}>
                  Change password
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => demote.mutate(c.id)}>
                  Remove
                </Button>
              </>
            )}
          </div>
        ))}
        {coaches.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No coaches yet.</div>
        )}
      </div>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password — {resetFor?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New password (min 8 chars)</Label>
            <div className="flex gap-2">
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => setNewPassword(makePassword())}>
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this password with the coach. They can sign in immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetFor(null)}>Cancel</Button>
            <Button
              onClick={() => resetFor && updatePassword.mutate({ user_id: resetFor.user_id, pwd: newPassword })}
              disabled={updatePassword.isPending || newPassword.length < 8}
              className="bg-spice text-spice-foreground hover:bg-spice/90"
            >
              {updatePassword.isPending ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function DeleteRequestsManager() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["admin_delete_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delete_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (req: any) => {
      const table = req.target_type === "course" ? "courses" : "recipes";
      const { error: delErr } = await supabase.from(table).delete().eq("id", req.target_id);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from("delete_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted & request approved");
      qc.invalidateQueries({ queryKey: ["admin_delete_requests"] });
      qc.invalidateQueries({ queryKey: ["admin_recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delete_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["admin_delete_requests"] });
    },
  });

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold mb-4">
        Delete requests
        {requests.length > 0 && (
          <span className="ml-2 text-sm align-middle px-2 py-0.5 rounded-full bg-spice text-spice-foreground">
            {requests.length}
          </span>
        )}
      </h2>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="bg-card border rounded-2xl divide-y">
          {requests.map((r: any) => (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {r.target_type}: {r.target_name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => reject.mutate(r.id)}>
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => approve.mutate(r)}
              >
                Approve & delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Courses Manager ─────────────── */
function CoursesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin_courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (c: any) => {
      const payload = {
        title: c.title,
        description: c.description ?? null,
        video_url: c.video_url || null,
        video_type: c.video_type || "youtube",
        thumbnail_url: c.thumbnail_url || null,
        price: Number(c.price) || 0,
        is_free: !!c.is_free,
        is_published: c.is_published ?? true,
      };
      if (c.id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Course saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin_courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <h2 className="font-display text-3xl font-semibold">Courses</h2>
        <Button
          onClick={() =>
            setEditing({
              title: "",
              description: "",
              video_url: "",
              video_type: "youtube",
              price: 0,
              is_free: true,
              is_published: true,
            })
          }
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <Plus className="size-4 mr-2" /> New course
        </Button>
      </div>
      <div className="bg-card border rounded-2xl divide-y">
        {courses.map((c: any) => (
          <div key={c.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.title}</div>
              <div className="text-xs text-muted-foreground">
                {c.is_free ? "Free" : `₹${c.price}`} · {c.is_published ? "Published" : "Draft"}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete "${c.title}"?`)) remove.mutate(c.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No courses yet.</div>
        )}
      </div>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit course" : "New course"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input
                  value={editing.thumbnail_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Video type</Label>
                  <select
                    className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                    value={editing.video_type ?? "youtube"}
                    onChange={(e) => setEditing({ ...editing, video_type: e.target.value })}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="upload">Upload (URL)</option>
                  </select>
                </div>
                <div>
                  <Label>Video URL</Label>
                  <Input
                    value={editing.video_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={editing.price ?? 0}
                    disabled={!!editing.is_free}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1.5"
                  />
                </div>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={!!editing.is_free}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        is_free: e.target.checked,
                        price: e.target.checked ? 0 : editing.price,
                      })
                    }
                  />
                  <span className="text-sm">Free</span>
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? true}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                />
                <span className="text-sm">Published</span>
              </label>

              {editing.id && (
                <div className="pt-4 border-t">
                  <CourseLessonsEditor courseId={editing.id} />
                </div>
              )}
              {!editing.id && (
                <p className="text-xs text-muted-foreground border-t pt-3">
                  Save the course first to add lessons, homework, and files.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.title}
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


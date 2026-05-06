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
import { Pencil, Plus, Trash2, ShieldCheck, FolderPlus, Upload, Dumbbell, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Workout, WorkoutSection, WorkoutSectionLink } from "@/lib/workout-types";

export const Route = createFileRoute("/admin-workouts")({
  component: AdminWorkoutsPage,
});

const empty: Partial<Workout> = {
  name: "",
  description: "",
  category: "Strength",
  level: "Beginner",
  image_url: "",
  video_url: "",
  video_type: "youtube",
  duration_min: 30,
  calories: null,
  equipment: "",
  instructions: "",
  is_published: true,
};

function AdminWorkoutsPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Workout> | null>(null);
  const [editingSectionIds, setEditingSectionIds] = useState<string[]>([]);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["admin_workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Workout[];
    },
    enabled: !!isAdmin,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin_workout_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WorkoutSection[];
    },
    enabled: !!isAdmin,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["admin_workout_section_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_section_links")
        .select("workout_id,section_id");
      if (error) throw error;
      return data as WorkoutSectionLink[];
    },
    enabled: !!isAdmin,
  });

  function openEditor(w: Partial<Workout> | null) {
    if (w?.id) {
      const ids = links.filter((l) => l.workout_id === w.id).map((l) => l.section_id);
      setEditingSectionIds(ids);
    } else {
      setEditingSectionIds(sections.length ? [sections[0].id] : []);
    }
    setEditing(w);
  }

  const save = useMutation({
    mutationFn: async ({ w, sectionIds }: { w: Partial<Workout>; sectionIds: string[] }) => {
      const primarySectionName =
        sections.find((s) => s.id === sectionIds[0])?.name ?? w.category ?? "Strength";
      const payload = {
        name: w.name!,
        description: w.description ?? null,
        category: primarySectionName,
        level: w.level ?? "Beginner",
        image_url: w.image_url || null,
        video_url: w.video_url || null,
        video_type: w.video_type || "youtube",
        duration_min: Number(w.duration_min) || 30,
        calories: w.calories != null && (w.calories as any) !== "" ? Number(w.calories) : null,
        equipment: w.equipment || null,
        instructions: w.instructions ?? null,
        is_published: w.is_published ?? true,
      };
      let workoutId = w.id;
      if (workoutId) {
        const { error } = await supabase.from("workouts").update(payload).eq("id", workoutId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workouts")
          .insert({ ...payload, created_by: user!.id })
          .select("id")
          .single();
        if (error) throw error;
        workoutId = data.id;
      }
      await supabase.from("workout_section_links").delete().eq("workout_id", workoutId!);
      if (sectionIds.length) {
        const rows = sectionIds.map((sid) => ({ workout_id: workoutId!, section_id: sid }));
        const { error } = await supabase.from("workout_section_links").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Workout saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_workouts"] });
      qc.invalidateQueries({ queryKey: ["admin_workout_section_links"] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["workout_section_links"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin_workouts"] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">Sign in</Link>
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
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to admin
      </Link>

      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-1">
              <ShieldCheck className="size-3.5" /> Admin
            </div>
            <h2 className="font-display text-3xl font-semibold">Workout sections</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Group workouts (e.g. Cardio, Strength, Yoga, Mobility).
            </p>
          </div>
        </div>
        <WorkoutSectionsManager sections={sections} />
      </div>

      <div>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <h2 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Dumbbell className="size-7 text-spice" /> Manage workouts
          </h2>
          <Button onClick={() => openEditor(empty)} className="bg-spice text-spice-foreground hover:bg-spice/90">
            <Plus className="size-4 mr-2" /> New workout
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
                  <th className="p-3 hidden md:table-cell">Level</th>
                  <th className="p-3 hidden md:table-cell">Duration</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workouts.map((w) => {
                  const names = links
                    .filter((l) => l.workout_id === w.id)
                    .map((l) => sections.find((s) => s.id === l.section_id)?.name)
                    .filter(Boolean) as string[];
                  return (
                    <tr key={w.id} className="hover:bg-accent/20">
                      <td className="p-2">
                        <div className="size-12 rounded-lg overflow-hidden bg-muted grid place-items-center">
                          {w.image_url ? (
                            <img src={w.image_url} alt={w.name} className="w-full h-full object-cover" />
                          ) : (
                            <Dumbbell className="size-5 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{w.name}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">
                        {names.length ? names.join(", ") : w.category}
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{w.level}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{w.duration_min} min</td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEditor(w)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${w.name}"?`)) remove.mutate(w.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {workouts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No workouts yet — add your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WorkoutEditorDialog
        value={editing}
        sections={sections}
        selectedSectionIds={editingSectionIds}
        setSelectedSectionIds={setEditingSectionIds}
        onClose={() => setEditing(null)}
        onSave={(w) => save.mutate({ w, sectionIds: editingSectionIds })}
        saving={save.isPending}
      />
    </div>
  );
}

function WorkoutSectionsManager({ sections }: { sections: WorkoutSection[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const addSection = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const nextOrder = (sections.at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase
        .from("workout_sections")
        .insert({ name: trimmed, description: description.trim() || null, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section added");
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["admin_workout_sections"] });
      qc.invalidateQueries({ queryKey: ["workout_sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section deleted");
      qc.invalidateQueries({ queryKey: ["admin_workout_sections"] });
      qc.invalidateQueries({ queryKey: ["workout_sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
        <div>
          <Label>New section name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cardio" className="mt-1.5" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" className="mt-1.5" />
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
                if (confirm(`Delete section "${s.name}"?`)) removeSection.mutate(s.id);
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

function WorkoutEditorDialog({
  value,
  sections,
  selectedSectionIds,
  setSelectedSectionIds,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Workout> | null;
  sections: WorkoutSection[];
  selectedSectionIds: string[];
  setSelectedSectionIds: (ids: string[]) => void;
  onClose: () => void;
  onSave: (w: Partial<Workout>) => void;
  saving: boolean;
}) {
  const [w, setW] = useState<Partial<Workout>>(value ?? {});
  useEffect(() => {
    if (value) setW(value);
  }, [value]);

  if (!value) return null;

  function update<K extends keyof Workout>(k: K, v: Workout[K]) {
    setW((prev) => ({ ...prev, [k]: v }));
  }

  function toggleSection(id: string) {
    setSelectedSectionIds(
      selectedSectionIds.includes(id)
        ? selectedSectionIds.filter((x) => x !== id)
        : [...selectedSectionIds, id],
    );
  }

  async function uploadImage(file: File) {
    const ext = file.name.split(".").pop();
    const path = `workouts/${crypto.randomUUID()}.${ext}`;
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
          <DialogTitle>{w.id ? "Edit workout" : "New workout"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={w.name ?? ""} onChange={(e) => update("name", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={w.description ?? ""} onChange={(e) => update("description", e.target.value)} className="mt-1.5" />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Level</Label>
              <select
                className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                value={w.level ?? "Beginner"}
                onChange={(e) => update("level", e.target.value)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div>
              <Label>Equipment</Label>
              <Input value={w.equipment ?? ""} onChange={(e) => update("equipment", e.target.value)} placeholder="None / Dumbbells / Mat…" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Image</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={w.image_url ?? ""}
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
            {w.image_url && (
              <img src={w.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Video type</Label>
              <select
                className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                value={w.video_type ?? "youtube"}
                onChange={(e) => update("video_type", e.target.value as any)}
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Upload (URL)</option>
              </select>
            </div>
            <div>
              <Label>Video URL (optional)</Label>
              <Input
                value={w.video_url ?? ""}
                onChange={(e) => update("video_url", e.target.value)}
                className="mt-1.5"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={w.duration_min ?? 30}
                onChange={(e) => update("duration_min", parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Calories (optional)</Label>
              <Input
                type="number"
                value={w.calories ?? ""}
                onChange={(e) => update("calories", e.target.value === "" ? (null as any) : (parseInt(e.target.value) || 0) as any)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Instructions</Label>
            <Textarea
              rows={6}
              value={w.instructions ?? ""}
              onChange={(e) => update("instructions", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={w.is_published ?? true}
              onChange={(e) => update("is_published", e.target.checked)}
            />
            Published (visible to users)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !w.name?.trim()}
            onClick={() => onSave(w)}
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

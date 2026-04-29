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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CourseLessonsEditor } from "@/components/CourseLessonsEditor";
import { CourseFilesEditor } from "@/components/CourseFilesEditor";

export const Route = createFileRoute("/coach")({
  component: CoachStudio,
});

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cuisine: string;
  image_url: string | null;
  prep_time_min: number;
  cook_time_min: number;
  default_servings: number;
  instructions: string | null;
  ingredients: any;
  video_url: string | null;
  video_type: string | null;
  created_by: string | null;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: string;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  is_published: boolean;
  created_by: string | null;
};

function CoachStudio() {
  const { user, isCoach, isAdmin, loading } = useAuth();

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in
        </Link>
      </div>
    );
  if (!isCoach && !isAdmin)
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Coach access required. Ask the admin to invite you.</p>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 space-y-12">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-1">
          <Sparkles className="size-3.5" /> Coach Studio
        </div>
        <h1 className="font-display text-4xl font-semibold">Your content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add new recipes and courses, edit your own, or request deletion (admin must approve).
        </p>
      </div>

      <CoachRecipes />
      <CoachCourses />
    </div>
  );
}

/* ─── Recipes ─── */

function CoachRecipes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["coach_recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!user,
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
        video_url: r.video_url || null,
        video_type: r.video_type || "youtube",
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
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["coach_recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestDelete = useMutation({
    mutationFn: async (r: Recipe) => {
      const reason = prompt(`Why delete "${r.name}"? (admin will review)`);
      if (!reason) throw new Error("Cancelled");
      const { error } = await supabase.from("delete_requests").insert({
        requester_id: user!.id,
        target_type: "recipe",
        target_id: r.id,
        target_name: r.name,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Delete request sent to admin"),
    onError: (e: any) => {
      if (e.message !== "Cancelled") toast.error(e.message);
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <h2 className="font-display text-2xl font-semibold">My recipes</h2>
        <Button
          onClick={() =>
            setEditing({
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
              video_url: "",
              video_type: "youtube",
            })
          }
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <Plus className="size-4 mr-2" /> New recipe
        </Button>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't added any recipes yet.</p>
      ) : (
        <div className="bg-card border rounded-2xl divide-y">
          {recipes.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-4">
              <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
                {r.image_url && (
                  <img src={r.image_url} className="w-full h-full object-cover" alt={r.name} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.category}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => requestDelete.mutate(r)}
                title="Request deletion (admin review)"
              >
                <AlertCircle className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <RecipeEditor value={editing} onClose={() => setEditing(null)} onSave={save.mutate} saving={save.isPending} />
    </div>
  );
}

function RecipeEditor({
  value,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Recipe> | null;
  onClose: () => void;
  onSave: (r: Partial<Recipe>) => void;
  saving: boolean;
}) {
  const [r, setR] = useState<Partial<Recipe>>(value ?? {});
  // sync when opening different items
  useStateSync(value, setR);
  if (!value) return null;

  function update<K extends keyof Recipe>(k: K, v: Recipe[K]) {
    setR((p) => ({ ...p, [k]: v }));
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r.id ? "Edit recipe" : "New recipe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={r.name ?? ""} onChange={(e) => update("name", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={r.description ?? ""} onChange={(e) => update("description", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Image URL</Label>
            <Input value={r.image_url ?? ""} onChange={(e) => update("image_url", e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Video type</Label>
              <select
                className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                value={r.video_type ?? "youtube"}
                onChange={(e) => update("video_type", e.target.value as any)}
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Upload (URL)</option>
              </select>
            </div>
            <div>
              <Label>Video URL</Label>
              <Input value={r.video_url ?? ""} onChange={(e) => update("video_url", e.target.value)} className="mt-1.5" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Prep (min)</Label>
              <Input type="number" value={r.prep_time_min ?? 0} onChange={(e) => update("prep_time_min", parseInt(e.target.value) || 0)} className="mt-1.5" />
            </div>
            <div>
              <Label>Cook (min)</Label>
              <Input type="number" value={r.cook_time_min ?? 0} onChange={(e) => update("cook_time_min", parseInt(e.target.value) || 0)} className="mt-1.5" />
            </div>
            <div>
              <Label>Servings</Label>
              <Input type="number" value={r.default_servings ?? 4} onChange={(e) => update("default_servings", parseInt(e.target.value) || 1)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea rows={5} value={r.instructions ?? ""} onChange={(e) => update("instructions", e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(r)} disabled={saving || !r.name} className="bg-spice text-spice-foreground hover:bg-spice/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Courses ─── */

function CoachCourses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Course> | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["coach_courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Course>) => {
      const payload = {
        title: c.title!,
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
        return { ...c, ...payload };
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert({ ...payload, created_by: user!.id })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (savedCourse, submittedCourse) => {
      toast.success(submittedCourse.id ? "Course saved" : "Course saved — add attachments below");
      setEditing(submittedCourse.id ? null : savedCourse);
      qc.invalidateQueries({ queryKey: ["coach_courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestDelete = useMutation({
    mutationFn: async (c: Course) => {
      const reason = prompt(`Why delete course "${c.title}"? (admin will review)`);
      if (!reason) throw new Error("Cancelled");
      const { error } = await supabase.from("delete_requests").insert({
        requester_id: user!.id,
        target_type: "course",
        target_id: c.id,
        target_name: c.title,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Delete request sent to admin"),
    onError: (e: any) => {
      if (e.message !== "Cancelled") toast.error(e.message);
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <h2 className="font-display text-2xl font-semibold">My courses</h2>
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

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't added any courses yet.</p>
      ) : (
        <div className="bg-card border rounded-2xl divide-y">
          {courses.map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-4">
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
                onClick={() => requestDelete.mutate(c)}
                title="Request deletion (admin review)"
              >
                <AlertCircle className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <CourseEditor value={editing} onClose={() => setEditing(null)} onSave={save.mutate} saving={save.isPending} />
    </div>
  );
}

export function CourseEditor({
  value,
  onClose,
  onSave,
  saving,
}: {
  value: Partial<Course> | null;
  onClose: () => void;
  onSave: (c: Partial<Course>) => void;
  saving: boolean;
}) {
  const [c, setC] = useState<Partial<Course>>(value ?? {});
  useStateSync(value, setC);
  if (!value) return null;

  function update<K extends keyof Course>(k: K, v: Course[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c.id ? "Edit course" : "New course"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={c.title ?? ""} onChange={(e) => update("title", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={c.description ?? ""} onChange={(e) => update("description", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Thumbnail URL</Label>
            <Input value={c.thumbnail_url ?? ""} onChange={(e) => update("thumbnail_url", e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Video type</Label>
              <select
                className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                value={c.video_type ?? "youtube"}
                onChange={(e) => update("video_type", e.target.value)}
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Video file / direct URL</option>
              </select>
            </div>
            <div>
              <Label>Video URL</Label>
              <Input value={c.video_url ?? ""} onChange={(e) => update("video_url", e.target.value)} className="mt-1.5" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" value={c.price ?? 0} onChange={(e) => update("price", parseFloat(e.target.value) || 0)} className="mt-1.5" disabled={!!c.is_free} />
            </div>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={c.is_free ?? false}
                onChange={(e) => {
                  update("is_free", e.target.checked);
                  if (e.target.checked) update("price", 0);
                }}
              />
              <span className="text-sm">Free course</span>
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={c.is_published ?? true}
              onChange={(e) => update("is_published", e.target.checked)}
            />
            <span className="text-sm">Published (visible to users)</span>
          </label>

          {c.id && (
            <>
              <div className="pt-4 border-t">
                <CourseFilesEditor courseId={c.id} />
              </div>
              <div className="pt-4 border-t">
                <CourseLessonsEditor courseId={c.id} />
              </div>
            </>
          )}
          {!c.id && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              Save the course first to add attachments, lessons, homework, and files.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(c)} disabled={saving || !c.title} className="bg-spice text-spice-foreground hover:bg-spice/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
function useStateSync<T>(value: T | null, setter: (v: T) => void) {
  useEffect(() => {
    if (value) setter(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}


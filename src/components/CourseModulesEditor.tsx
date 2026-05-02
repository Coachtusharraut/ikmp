import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { toast } from "sonner";
import { CourseLessonsEditor } from "./CourseLessonsEditor";

type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export function CourseModulesEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Module> | null>(null);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
  });

  const save = useMutation({
    mutationFn: async (m: Partial<Module>) => {
      const payload = {
        course_id: courseId,
        title: m.title!,
        description: m.description ?? null,
        sort_order: Number(m.sort_order) || modules.length,
      };
      if (m.id) {
        const { error } = await supabase
          .from("course_modules")
          .update(payload)
          .eq("id", m.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("course_modules")
          .insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Module saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["modules", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Detach lessons first so they're not orphaned/deleted unintentionally.
      await supabase.from("course_lessons").update({ module_id: null }).eq("module_id", id);
      const { error } = await supabase.from("course_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Module deleted (lessons kept, unassigned)");
      qc.invalidateQueries({ queryKey: ["modules", courseId] });
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-xl font-semibold inline-flex items-center gap-2">
            <Layers className="size-5 text-spice" /> Modules
          </h3>
          <p className="text-xs text-muted-foreground">
            Organise lessons into modules (e.g. "Week 1 — Foundations"). Open a module to add lessons inside it.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setEditing({ title: "", description: "", sort_order: modules.length })
          }
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <Plus className="size-4 mr-1" /> Add module
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No modules yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {modules.map((m, i) => {
            const open = openModuleId === m.id;
            return (
              <div key={m.id} className="border rounded-xl bg-card overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <button
                    onClick={() => setOpenModuleId(open ? null : m.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Toggle"
                  >
                    {open ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      <span className="text-xs text-muted-foreground tabular-nums mr-2">
                        Module {i + 1}
                      </span>
                      {m.title}
                    </div>
                    {m.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {m.description}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(m)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Delete module "${m.title}"? Lessons inside it will be kept but unassigned.`))
                        remove.mutate(m.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {open && (
                  <div className="border-t p-3 bg-muted/20">
                    <CourseLessonsEditor courseId={courseId} moduleId={m.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lessons not yet assigned to any module */}
      <details className="border rounded-xl bg-card">
        <summary className="p-3 cursor-pointer text-sm font-medium text-muted-foreground">
          Unassigned lessons (legacy / direct)
        </summary>
        <div className="p-3 border-t">
          <CourseLessonsEditor courseId={courseId} moduleId={null} />
        </div>
      </details>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit module" : "New module"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1.5"
                  placeholder="e.g. Week 1 — Foundations"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.title?.trim()}
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

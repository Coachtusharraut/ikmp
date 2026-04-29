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
import { Plus, Pencil, Trash2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: string;
  homework: string | null;
  sort_order: number;
};

type LessonFile = {
  id: string;
  lesson_id: string;
  name: string;
  file_url: string;
};

export function CourseLessonsEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Lesson> | null>(null);

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const save = useMutation({
    mutationFn: async (l: Partial<Lesson>) => {
      const payload = {
        course_id: courseId,
        title: l.title!,
        description: l.description ?? null,
        video_url: l.video_url || null,
        video_type: l.video_type || "youtube",
        homework: l.homework ?? null,
        sort_order: Number(l.sort_order) || lessons.length,
      };
      if (l.id) {
        const { error } = await supabase
          .from("course_lessons")
          .update(payload)
          .eq("id", l.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("course_lessons")
          .insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Lesson saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson deleted");
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">Lessons</h3>
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              title: "",
              description: "",
              video_url: "",
              video_type: "youtube",
              homework: "",
              sort_order: lessons.length,
            })
          }
          className="bg-spice text-spice-foreground hover:bg-spice/90"
        >
          <Plus className="size-4 mr-1" /> Add lesson
        </Button>
      </div>
      {lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lessons yet.</p>
      ) : (
        <div className="border rounded-xl divide-y bg-card">
          {lessons.map((l, i) => (
            <div key={l.id} className="p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums w-6">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.title}</div>
                  {l.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {l.description}
                    </div>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing(l)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete lesson "${l.title}"?`)) remove.mutate(l.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="pl-9">
                <LessonFiles lessonId={l.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit lesson" : "New lesson"}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Video type</Label>
                  <select
                    className="mt-1.5 w-full border rounded-md h-9 px-3 bg-background text-sm"
                    value={editing.video_type ?? "youtube"}
                    onChange={(e) =>
                      setEditing({ ...editing, video_type: e.target.value })
                    }
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
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label>Homework / assignment</Label>
                <Textarea
                  rows={4}
                  value={editing.homework ?? ""}
                  onChange={(e) => setEditing({ ...editing, homework: e.target.value })}
                  className="mt-1.5"
                  placeholder="What should the learner do after watching?"
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })
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

function LessonFiles({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: files = [] } = useQuery({
    queryKey: ["lesson_files", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lesson_files")
        .select("*")
        .eq("lesson_id", lessonId);
      if (error) throw error;
      return data as LessonFile[];
    },
  });

  async function upload(file: File) {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${lessonId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-files")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("course-files").getPublicUrl(path);
      const { error } = await supabase
        .from("course_lesson_files")
        .insert({ lesson_id: lessonId, name: file.name, file_url: data.publicUrl });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["lesson_files", lessonId] });
      toast.success("File attached");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: LessonFile) {
    if (!confirm(`Remove ${f.name}?`)) return;
    const { error } = await supabase.from("course_lesson_files").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["lesson_files", lessonId] });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {files.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted"
        >
          <FileText className="size-3" />
          <a href={f.file_url} target="_blank" rel="noreferrer" className="hover:underline">
            {f.name}
          </a>
          <button onClick={() => remove(f)} className="text-destructive hover:opacity-100 opacity-60">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <label className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer hover:bg-accent">
        <Upload className="size-3" />
        {busy ? "Uploading…" : "Attach file"}
        <input
          type="file"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
    </div>
  );
}

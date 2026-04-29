import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

type CourseFile = { id: string; course_id: string; name: string; file_url: string };

export function CourseFilesEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ["course_files", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_files")
        .select("*")
        .eq("course_id", courseId);
      if (error) throw error;
      return data as CourseFile[];
    },
  });

  async function uploadMany(fileList: FileList) {
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop();
        const path = `course-${courseId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("course-files")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("course-files").getPublicUrl(path);
        const { error } = await (supabase as any)
          .from("course_files")
          .insert({ course_id: courseId, name: file.name, file_url: data.publicUrl });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["course_files", courseId] });
      toast.success("File(s) attached");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: CourseFile) {
    if (!confirm(`Remove ${f.name}?`)) return;
    const { error } = await (supabase as any).from("course_files").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["course_files", courseId] });
  }

  return (
    <div className="space-y-2">
      <Label>Attachments & resources</Label>
      <p className="text-xs text-muted-foreground">
        Add PDFs, documents, worksheets, images, audio, or any other learner files. Multiple files allowed — videos are not required.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {files.length === 0 && (
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/60">
            No attachments yet
          </span>
        )}
        {files.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted"
          >
            <FileText className="size-3" />
            <a href={f.file_url} target="_blank" rel="noreferrer" className="hover:underline">
              {f.name}
            </a>
            <button onClick={() => remove(f)} className="text-destructive opacity-60 hover:opacity-100">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <label className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer hover:bg-accent">
          <Upload className="size-3" />
          {busy ? "Uploading…" : "Attach file(s)"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) uploadMany(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

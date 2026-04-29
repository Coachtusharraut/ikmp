CREATE TABLE IF NOT EXISTS public.course_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage course files" ON public.course_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Coaches manage own course files" ON public.course_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coach') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_files.course_id AND c.created_by = auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'coach') AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_files.course_id AND c.created_by = auth.uid()));
CREATE POLICY "View files of accessible courses" ON public.course_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_files.course_id AND (c.is_free = true OR c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid()))));
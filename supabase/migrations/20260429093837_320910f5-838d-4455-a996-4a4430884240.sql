-- Course lessons
CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT NOT NULL DEFAULT 'youtube',
  homework TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.course_lesson_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_files ENABLE ROW LEVEL SECURITY;

-- View lessons: enrolled users, course owner, admin, or if course is free
CREATE POLICY "View lessons of accessible courses"
ON public.course_lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_id AND (
      c.is_free = true
      OR c.created_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Admins manage lessons"
ON public.course_lessons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches insert lessons in own courses"
ON public.course_lessons FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid())
);

CREATE POLICY "Coaches update lessons in own courses"
ON public.course_lessons FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid())
);

-- Files: same access as parent lesson
CREATE POLICY "View files of accessible lessons"
ON public.course_lesson_files FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND (
      c.is_free = true
      OR c.created_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Admins manage lesson files"
ON public.course_lesson_files FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches manage own lesson files"
ON public.course_lesson_files FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.course_lessons l JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.course_lessons l JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  )
);

CREATE TRIGGER tg_course_lessons_updated_at
BEFORE UPDATE ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_course_lessons_course ON public.course_lessons(course_id, sort_order);
CREATE INDEX idx_course_lesson_files_lesson ON public.course_lesson_files(lesson_id);

-- Storage bucket for lesson files
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone reads course files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-files');

CREATE POLICY "Coaches and admins upload course files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
  AND (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Coaches and admins delete course files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-files'
  AND (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);
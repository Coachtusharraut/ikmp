-- Recipes: video fields
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'youtube';

-- Recipes RLS: coaches add new + edit own
DROP POLICY IF EXISTS "Coaches insert recipes" ON public.recipes;
CREATE POLICY "Coaches insert recipes"
ON public.recipes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Coaches update own recipes" ON public.recipes;
CREATE POLICY "Coaches update own recipes"
ON public.recipes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid());

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text,
  video_type text NOT NULL DEFAULT 'youtube',
  price numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views published courses"
ON public.courses FOR SELECT TO authenticated
USING (is_published = true OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all courses"
ON public.courses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches insert courses"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid());

CREATE POLICY "Coaches update own courses"
ON public.courses FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role) AND created_by = auth.uid());

CREATE TRIGGER tg_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Course enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_status text NOT NULL DEFAULT 'free',
  amount_paid numeric NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments"
ON public.course_enrollments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own enrollments"
ON public.course_enrollments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage enrollments"
ON public.course_enrollments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Delete requests
CREATE TABLE IF NOT EXISTS public.delete_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  target_name text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delete_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches create delete requests"
ON public.delete_requests FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid() AND has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Requesters view own requests"
ON public.delete_requests FOR SELECT TO authenticated
USING (requester_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage delete requests"
ON public.delete_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read individual files (no listing) by allowing GET on objects via direct path only
DROP POLICY IF EXISTS "Public read course videos" ON storage.objects;
CREATE POLICY "Public read course videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-videos');

DROP POLICY IF EXISTS "Admins and coaches upload course videos" ON storage.objects;
CREATE POLICY "Admins and coaches upload course videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
);

DROP POLICY IF EXISTS "Admins and coaches update course videos" ON storage.objects;
CREATE POLICY "Admins and coaches update course videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
);

DROP POLICY IF EXISTS "Admins delete course videos" ON storage.objects;
CREATE POLICY "Admins delete course videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-videos'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Demo free course
INSERT INTO public.courses (title, description, video_url, video_type, price, is_free, is_published)
SELECT
  'Welcome: 7 Habits for Holistic Indian Eating',
  'A free demo course by Coach Tushar Raut. Learn the foundational habits that make Indian home-cooking the secret to lasting weight loss and energy.',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'youtube',
  0, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE title = 'Welcome: 7 Habits for Holistic Indian Eating');
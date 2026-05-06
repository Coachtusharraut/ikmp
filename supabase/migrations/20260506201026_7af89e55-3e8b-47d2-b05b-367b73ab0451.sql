
-- Workouts feature: workouts, workout_sections (categories), workout_section_links (many-to-many)

CREATE TABLE public.workout_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Strength',
  level text NOT NULL DEFAULT 'Beginner',
  image_url text,
  video_url text,
  video_type text DEFAULT 'youtube',
  duration_min integer NOT NULL DEFAULT 30,
  calories integer,
  equipment text,
  instructions text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_section_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.workout_sections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workout_id, section_id)
);

ALTER TABLE public.workout_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_section_links ENABLE ROW LEVEL SECURITY;

-- workout_sections policies
CREATE POLICY "Admins manage workout_sections" ON public.workout_sections
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authed views workout_sections" ON public.workout_sections
  FOR SELECT TO authenticated USING (true);

-- workouts policies
CREATE POLICY "Admins manage workouts" ON public.workouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authed views published workouts" ON public.workouts
  FOR SELECT TO authenticated USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

-- workout_section_links policies
CREATE POLICY "Admins manage workout_section_links" ON public.workout_section_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authed views workout_section_links" ON public.workout_section_links
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER set_workouts_updated_at BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_workout_sections_updated_at BEFORE UPDATE ON public.workout_sections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

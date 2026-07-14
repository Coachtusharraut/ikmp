
CREATE TABLE public.nav_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','member','coach','admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nav_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nav_items TO authenticated;
GRANT ALL ON public.nav_items TO service_role;

ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view nav items"
  ON public.nav_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert nav items"
  ON public.nav_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update nav items"
  ON public.nav_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete nav items"
  ON public.nav_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nav_items_set_updated_at
  BEFORE UPDATE ON public.nav_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed with current nav
INSERT INTO public.nav_items (label, href, icon, sort_order, visibility) VALUES
  ('Home', '/', 'Home', 10, 'public'),
  ('Recipes', '/recipes', 'UtensilsCrossed', 20, 'public'),
  ('Workouts', '/workouts', 'Dumbbell', 30, 'public'),
  ('Courses', '/courses', 'GraduationCap', 40, 'public'),
  ('Live', '/live', 'Video', 50, 'public'),
  ('My Plan', '/my-plan', 'ClipboardList', 60, 'member'),
  ('This Week', '/planner', 'CalendarDays', 70, 'member'),
  ('Grocery', '/grocery', 'ShoppingBasket', 80, 'member'),
  ('Coach', '/coach', 'Sparkles', 90, 'coach'),
  ('Admin', '/admin', 'ShieldCheck', 100, 'admin');

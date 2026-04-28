-- Sections table: admin-managed categories for recipes
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views sections"
ON public.sections FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage sections"
ON public.sections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sections_set_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default sections
INSERT INTO public.sections (name, description, sort_order) VALUES
  ('Veg', 'Vegetarian mains and sides', 1),
  ('Non-Veg', 'Chicken, mutton, fish & egg dishes', 2),
  ('Quick Smoothies', 'Fast nutrient-packed smoothies', 3),
  ('Breakfast', 'Light and energising morning meals', 4),
  ('Snacks', 'Healthy in-between bites', 5),
  ('Desserts', 'Mindful Indian sweets', 6)
ON CONFLICT (name) DO NOTHING;
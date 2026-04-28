
-- 1. Junction table: recipes <-> sections (many-to-many)
CREATE TABLE public.recipe_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, section_id)
);

CREATE INDEX idx_recipe_sections_recipe ON public.recipe_sections(recipe_id);
CREATE INDEX idx_recipe_sections_section ON public.recipe_sections(section_id);

ALTER TABLE public.recipe_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views recipe_sections"
  ON public.recipe_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage recipe_sections"
  ON public.recipe_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Backfill from existing recipes.category -> sections.name
INSERT INTO public.recipe_sections (recipe_id, section_id)
SELECT r.id, s.id
FROM public.recipes r
JOIN public.sections s ON lower(s.name) = lower(r.category)
ON CONFLICT DO NOTHING;

-- 2. Site settings (singleton row)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  site_name text NOT NULL DEFAULT '@coachtusharraut',
  tagline text NOT NULL DEFAULT 'Indian Kitchen Meal Plan',
  hero_title text NOT NULL DEFAULT 'Eat well. Lose weight. Feel vibrant.',
  hero_subtitle text NOT NULL DEFAULT 'Curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut.',
  meta_description text NOT NULL DEFAULT 'Lose weight & achieve holistic health with curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut.',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT 'oklch(0.22 0.02 50)',
  spice_color text NOT NULL DEFAULT 'oklch(0.62 0.17 40)',
  background_color text NOT NULL DEFAULT 'oklch(0.985 0.005 80)',
  foreground_color text NOT NULL DEFAULT 'oklch(0.18 0.015 50)',
  accent_color text NOT NULL DEFAULT 'oklch(0.93 0.04 65)',
  font_display text NOT NULL DEFAULT 'Fraunces',
  font_body text NOT NULL DEFAULT 'Inter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views site_settings"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage site_settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed singleton row
INSERT INTO public.site_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- 3. Branding storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

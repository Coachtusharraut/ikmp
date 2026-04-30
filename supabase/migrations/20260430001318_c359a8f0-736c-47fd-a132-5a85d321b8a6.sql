ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS intro_video_type text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS intro_title text NOT NULL DEFAULT 'How to use this app',
  ADD COLUMN IF NOT EXISTS intro_subtitle text NOT NULL DEFAULT 'Watch this short intro to get the most out of your meal plan.';

-- Public storage bucket for intro video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('intro-video', 'intro-video', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read intro video') THEN
    CREATE POLICY "Public read intro video" ON storage.objects FOR SELECT USING (bucket_id = 'intro-video');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins upload intro video') THEN
    CREATE POLICY "Admins upload intro video" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins update intro video') THEN
    CREATE POLICY "Admins update intro video" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins delete intro video') THEN
    CREATE POLICY "Admins delete intro video" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
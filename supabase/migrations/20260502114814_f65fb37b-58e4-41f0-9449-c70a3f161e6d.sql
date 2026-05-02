
-- ============ COURSE MODULES ============
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View modules of accessible courses" ON public.course_modules
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id
    AND (c.is_free = true OR c.created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())))
);
CREATE POLICY "Admins manage modules" ON public.course_modules
FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Coaches manage own course modules" ON public.course_modules
FOR ALL TO authenticated
USING (has_role(auth.uid(),'coach'::app_role) AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.created_by = auth.uid()))
WITH CHECK (has_role(auth.uid(),'coach'::app_role) AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.created_by = auth.uid()));

CREATE TRIGGER course_modules_set_updated BEFORE UPDATE ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Add module_id to existing lessons
ALTER TABLE public.course_lessons ADD COLUMN module_id uuid;

-- Backfill: create a default module per existing course and attach orphan lessons
INSERT INTO public.course_modules (course_id, title, sort_order)
SELECT DISTINCT c.id, 'Module 1', 0
FROM public.courses c
WHERE EXISTS (SELECT 1 FROM public.course_lessons l WHERE l.course_id = c.id AND l.module_id IS NULL);

UPDATE public.course_lessons l
SET module_id = m.id
FROM public.course_modules m
WHERE m.course_id = l.course_id AND l.module_id IS NULL AND m.title = 'Module 1';

-- ============ ANNOUNCEMENTS (in-app banner) ============
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_html text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views published announcements" ON public.announcements
FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins manage announcements" ON public.announcements
FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER announcements_set_updated BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dismissals" ON public.announcement_dismissals
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ PUSH SUBSCRIPTIONS ============
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete subscriptions" ON public.push_subscriptions
FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.push_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  icon_url text,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage push log" ON public.push_notifications_log
FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============ NEWSLETTER LOG ============
CREATE TABLE public.newsletter_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  also_announcement boolean NOT NULL DEFAULT false,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage newsletter log" ON public.newsletter_log
FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============ MAIN ADMIN HELPER ============
CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND email = 'tusharraut2001@gmail.com'
  )
$$;

-- Update user_roles policies: prevent removing/changing main admin's admin role
CREATE POLICY "Cannot demote main admin" ON public.user_roles
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  AND NOT (role = 'admin'::app_role AND public.is_main_admin(user_id))
);

-- Lessons: also allow filtering by module via RLS already (policies cover via course_id)

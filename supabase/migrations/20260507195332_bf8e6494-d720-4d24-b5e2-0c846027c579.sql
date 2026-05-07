
-- assigned plan, one per user (admin-owned)
CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  assigned_by uuid,
  name text NOT NULL DEFAULT 'My Plan',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_plans" ON public.user_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own plan" ON public.user_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER user_plans_updated BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- admin-assigned items
CREATE TABLE public.user_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.user_plans(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('recipe','workout')),
  item_id uuid NOT NULL,
  times_per_week integer NOT NULL DEFAULT 1,
  servings integer,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_plan_items(plan_id);
ALTER TABLE public.user_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plan items" ON public.user_plan_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own plan items" ON public.user_plan_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

-- user override: when any rows exist for a plan, the user sees these instead of admin's
CREATE TABLE public.user_plan_user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.user_plans(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('recipe','workout')),
  item_id uuid NOT NULL,
  times_per_week integer NOT NULL DEFAULT 1,
  servings integer,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_plan_user_items(plan_id);
ALTER TABLE public.user_plan_user_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own override" ON public.user_plan_user_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins view overrides" ON public.user_plan_user_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- completion tracking
CREATE TABLE public.plan_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('recipe','workout')),
  item_id uuid NOT NULL,
  note text,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.plan_item_completions(user_id, completed_at DESC);
ALTER TABLE public.plan_item_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completions" ON public.plan_item_completions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all completions" ON public.plan_item_completions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- body check-ins
CREATE TABLE public.user_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_at date NOT NULL DEFAULT (now()::date),
  weight_kg numeric,
  waist_cm numeric,
  chest_cm numeric,
  hips_cm numeric,
  body_fat_pct numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_checkins(user_id, measured_at DESC);
ALTER TABLE public.user_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON public.user_checkins FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all checkins" ON public.user_checkins FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

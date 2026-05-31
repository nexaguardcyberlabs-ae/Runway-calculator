-- ============================================================
-- 003_planned_events.sql — planned events table + RLS
-- Run in Supabase SQL Editor after 002_income.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.planned_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES public.companies NOT NULL,
  title           text NOT NULL,
  event_type      text NOT NULL,           -- 'expense' | 'income'
  category_id     text REFERENCES public.expense_categories,  -- nullable
  amount          numeric NOT NULL,
  currency        text NOT NULL,
  event_date      date NOT NULL,
  is_recurring    boolean DEFAULT false,
  recurrence      text,                    -- null | 'monthly' | 'quarterly' | 'yearly'
  recurrence_end  date,
  notes           text,
  created_by      uuid REFERENCES public.profiles,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.planned_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_events_select_own_companies" ON public.planned_events
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "planned_events_insert_own_companies" ON public.planned_events
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "planned_events_update_own_companies" ON public.planned_events
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "planned_events_delete_own_companies" ON public.planned_events
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 002_income.sql — income table + RLS
-- Run in Supabase SQL Editor after 001_init.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.income (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES public.companies NOT NULL,
  source          text,                    -- client / source name
  income_type     text NOT NULL,           -- 'retainer' | 'project' | 'other'
  amount          numeric NOT NULL,
  currency        text NOT NULL,
  income_date     date NOT NULL,
  is_recurring    boolean DEFAULT false,
  recurrence      text,                    -- null | 'monthly' | 'quarterly' | 'yearly'
  recurrence_end  date,
  created_by      uuid REFERENCES public.profiles,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_select_own_companies" ON public.income
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "income_insert_own_companies" ON public.income
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "income_update_own_companies" ON public.income
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "income_delete_own_companies" ON public.income
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

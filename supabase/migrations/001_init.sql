-- ============================================================
-- 001_init.sql — Nexaguard / Zolvn Financial Runway Tool
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  currency         text NOT NULL,       -- 'AED' or 'INR'
  fiscal_year_start int NOT NULL,       -- 1 = Jan, 4 = April
  opening_cash     numeric DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_companies (
  user_id    uuid REFERENCES public.profiles ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies ON DELETE CASCADE,
  role       text DEFAULT 'admin',      -- 'admin' | 'viewer'
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id           text PRIMARY KEY,
  display_name text NOT NULL,
  sort_order   int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES public.companies NOT NULL,
  category_id     text REFERENCES public.expense_categories NOT NULL,
  description     text,
  amount          numeric NOT NULL,
  currency        text NOT NULL,
  expense_date    date NOT NULL,
  is_recurring    boolean DEFAULT false,
  recurrence      text,               -- null | 'monthly' | 'quarterly' | 'yearly'
  recurrence_end  date,
  created_by      uuid REFERENCES public.profiles,
  created_at      timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;

-- companies: authenticated users can SELECT any company (needed for initial setup)
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- profiles: users manage only their own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_companies: users can see and insert their own mappings
CREATE POLICY "user_companies_select_own" ON public.user_companies
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_companies_insert_own" ON public.user_companies
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- expense_categories: all authenticated users can read
CREATE POLICY "expense_categories_select" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

-- expenses: scoped to companies the user belongs to
CREATE POLICY "expenses_select_own_companies" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_insert_own_companies" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_update_own_companies" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_delete_own_companies" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- RPC: called after login to bootstrap profile + company links
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.setup_user_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (auth.uid())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_companies (user_id, company_id, role)
  SELECT auth.uid(), id, 'admin'
  FROM public.companies
  ON CONFLICT DO NOTHING;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- SEED: expense_categories
-- ──────────────────────────────────────────────────────────

INSERT INTO public.expense_categories (id, display_name, sort_order) VALUES
  ('salaries',          'Salaries & Wages',                1),
  ('incentives',        'Incentives & Bonuses',            2),
  ('software',          'Software Subscriptions',          3),
  ('cloud_infra',       'Cloud Infrastructure',            4),
  ('domains_hosting',   'Domains & Hosting',               5),
  ('rent',              'Office Rent',                     6),
  ('furniture',         'Furniture & Fitouts',             7),
  ('devices',           'Laptops & Devices',               8),
  ('wifi_connectivity', 'Internet & Connectivity',         9),
  ('communication',     'Communication (SIM / Calling)',  10),
  ('travel',            'Travel & Transport',             11),
  ('marketing',         'Marketing & Advertising',        12),
  ('printing',          'Print & Stationery',             13),
  ('banking',           'Banking & Transaction Fees',     14),
  ('living',            'Founder Living Expenses',        15),
  ('visa',              'Visa & Immigration',             16),
  ('license',           'Licenses & Permits',             17),
  ('govt_fees',         'Government Fees & Charges',      18),
  ('business_services', 'Business Services',              19),
  ('registration',      'Business Registration & Renewals', 20),
  ('misc',              'Miscellaneous',                  21)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- SEED: companies
-- ──────────────────────────────────────────────────────────

INSERT INTO public.companies (name, currency, fiscal_year_start, opening_cash) VALUES
  ('Nexaguard Cyber Labs', 'AED', 1, 0),
  ('Zolvn Technologies',   'INR', 4, 0)
ON CONFLICT DO NOTHING;

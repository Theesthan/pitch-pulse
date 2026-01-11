-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('analyst', 'reviewer', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  cik TEXT,
  name TEXT NOT NULL,
  sic_code TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create run_status enum
CREATE TYPE public.run_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');

-- Create runs table
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fiscal_year_start INTEGER NOT NULL,
  fiscal_year_end INTEGER NOT NULL,
  status run_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create run_data_cache table for SEC/Stooq/Wikipedia data
CREATE TABLE public.run_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'sec', 'stooq', 'wikipedia'
  data_type TEXT NOT NULL, -- 'filings', 'prices', 'description'
  raw_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (run_id, source, data_type)
);

-- Create run_versions table
CREATE TABLE public.run_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  kpis JSONB,
  pitchbook_content JSONB,
  credit_memo_content JSONB,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, version_number)
);

-- Create comments table with inline highlighting support
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_version_id UUID NOT NULL REFERENCES public.run_versions(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- 'pitchbook', 'credit_memo'
  highlight_start INTEGER, -- text position start
  highlight_end INTEGER, -- text position end
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'reviewer' THEN 2 
      WHEN 'analyst' THEN 3 
    END
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can modify, all can read own)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Companies policies (all authenticated can view, owners can modify)
CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Runs policies
CREATE POLICY "Authenticated users can view runs"
  ON public.runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create runs"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners, reviewers, and admins can update runs"
  ON public.runs FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = reviewer_id 
    OR public.has_role(auth.uid(), 'reviewer')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners and admins can delete runs"
  ON public.runs FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Run data cache policies
CREATE POLICY "Users can view run data for accessible runs"
  ON public.run_data_cache FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.runs WHERE runs.id = run_data_cache.run_id
  ));

CREATE POLICY "Users can insert run data for own runs"
  ON public.run_data_cache FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.runs 
    WHERE runs.id = run_data_cache.run_id 
    AND runs.created_by = auth.uid()
  ));

CREATE POLICY "Users can update run data for own runs"
  ON public.run_data_cache FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.runs 
    WHERE runs.id = run_data_cache.run_id 
    AND runs.created_by = auth.uid()
  ));

-- Run versions policies
CREATE POLICY "Users can view versions for accessible runs"
  ON public.run_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.runs WHERE runs.id = run_versions.run_id
  ));

CREATE POLICY "Users can create versions for own runs"
  ON public.run_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update unlocked versions they created"
  ON public.run_versions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    AND is_locked = false
  );

-- Comments policies
CREATE POLICY "Users can view comments on accessible versions"
  ON public.comments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.run_versions rv
    JOIN public.runs r ON r.id = rv.run_id
    WHERE rv.id = comments.run_version_id
  ));

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'analyst');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
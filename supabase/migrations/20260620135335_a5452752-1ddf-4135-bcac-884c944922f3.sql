
-- =========================================================================
-- Enums
-- =========================================================================
CREATE TYPE public.pipeline_status AS ENUM ('draft', 'running', 'success', 'failed');
CREATE TYPE public.dataset_kind AS ENUM ('source', 'processed');
CREATE TYPE public.step_kind AS ENUM ('validate', 'clean', 'transform');
CREATE TYPE public.execution_status AS ENUM ('pending', 'running', 'success', 'failed');

-- =========================================================================
-- updated_at helper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- profiles
-- =========================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- pipelines
-- =========================================================================
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.pipeline_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT ALL ON public.pipelines TO service_role;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pipelines" ON public.pipelines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pipelines_updated BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pipelines_user ON public.pipelines(user_id, created_at DESC);

-- =========================================================================
-- datasets
-- =========================================================================
CREATE TABLE public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.dataset_kind NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime text,
  row_count integer NOT NULL DEFAULT 0,
  column_count integer NOT NULL DEFAULT 0,
  schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own datasets" ON public.datasets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_datasets_pipeline ON public.datasets(pipeline_id, kind, created_at DESC);

-- =========================================================================
-- pipeline_steps
-- =========================================================================
CREATE TABLE public.pipeline_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.step_kind NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_steps TO authenticated;
GRANT ALL ON public.pipeline_steps TO service_role;
ALTER TABLE public.pipeline_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own steps" ON public.pipeline_steps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_steps_pipeline ON public.pipeline_steps(pipeline_id, order_index);

-- =========================================================================
-- executions
-- =========================================================================
CREATE TABLE public.executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.execution_status NOT NULL DEFAULT 'pending',
  records_in integer NOT NULL DEFAULT 0,
  records_out integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  error text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executions TO authenticated;
GRANT ALL ON public.executions TO service_role;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own executions" ON public.executions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_executions_pipeline ON public.executions(pipeline_id, created_at DESC);
CREATE INDEX idx_executions_user ON public.executions(user_id, created_at DESC);

-- =========================================================================
-- Storage policies: users can only access their own folder in each bucket.
-- Convention: storage_path = "<user_id>/<pipeline_id>/<filename>"
-- =========================================================================
CREATE POLICY "Users read own raw files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'raw-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own raw files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'raw-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own raw files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'raw-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own raw files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'raw-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own processed files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'processed-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own processed files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'processed-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own processed files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'processed-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own processed files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'processed-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

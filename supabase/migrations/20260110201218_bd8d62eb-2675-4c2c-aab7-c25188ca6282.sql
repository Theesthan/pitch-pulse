-- Add unique constraint for run_data_cache upsert
ALTER TABLE public.run_data_cache ADD CONSTRAINT run_data_cache_run_id_data_type_key UNIQUE (run_id, data_type);
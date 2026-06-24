-- Migration: add short_code to team/project/schema_table for shorter URLs

ALTER TABLE public.team
  ADD COLUMN IF NOT EXISTS short_code text;

ALTER TABLE public.project
  ADD COLUMN IF NOT EXISTS short_code text;

ALTER TABLE public.schema_table
  ADD COLUMN IF NOT EXISTS short_code text;

-- Backfill existing rows with 8-character hex short codes.
DO $$
DECLARE
  rec record;
  code text;
BEGIN
  FOR rec IN SELECT id FROM public.team WHERE short_code IS NULL LOOP
    LOOP
      code := substr(md5(gen_random_uuid()::text), 1, 8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.team WHERE short_code = code);
    END LOOP;
    UPDATE public.team SET short_code = code WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM public.project WHERE short_code IS NULL LOOP
    LOOP
      code := substr(md5(gen_random_uuid()::text), 1, 8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.project WHERE short_code = code);
    END LOOP;
    UPDATE public.project SET short_code = code WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id, project_id FROM public.schema_table WHERE short_code IS NULL LOOP
    LOOP
      code := substr(md5(gen_random_uuid()::text), 1, 8);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.schema_table
        WHERE project_id = rec.project_id AND short_code = code
      );
    END LOOP;
    UPDATE public.schema_table SET short_code = code WHERE id = rec.id;
  END LOOP;
END $$;

-- Unique indexes (ignore soft-deleted rows so codes can be reused after deletion)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_short_code
  ON public.team(short_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_short_code
  ON public.project(short_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_table_short_code
  ON public.schema_table(project_id, short_code)
  WHERE deleted_at IS NULL;

-- Auto-generate short_code on insert when not provided
CREATE OR REPLACE FUNCTION public.team_auto_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.short_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    code := substr(md5(gen_random_uuid()::text), 1, 8);
    IF NOT EXISTS (SELECT 1 FROM public.team WHERE short_code = code AND deleted_at IS NULL) THEN
      NEW.short_code := code;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_auto_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.short_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    code := substr(md5(gen_random_uuid()::text), 1, 8);
    IF NOT EXISTS (SELECT 1 FROM public.project WHERE short_code = code AND deleted_at IS NULL) THEN
      NEW.short_code := code;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_table_auto_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.short_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    code := substr(md5(gen_random_uuid()::text), 1, 8);
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_table
      WHERE project_id = NEW.project_id AND short_code = code AND deleted_at IS NULL
    ) THEN
      NEW.short_code := code;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS team_auto_short_code_trigger ON public.team;
CREATE TRIGGER team_auto_short_code_trigger
  BEFORE INSERT ON public.team
  FOR EACH ROW EXECUTE FUNCTION public.team_auto_short_code();

DROP TRIGGER IF EXISTS project_auto_short_code_trigger ON public.project;
CREATE TRIGGER project_auto_short_code_trigger
  BEFORE INSERT ON public.project
  FOR EACH ROW EXECUTE FUNCTION public.project_auto_short_code();

DROP TRIGGER IF EXISTS schema_table_auto_short_code_trigger ON public.schema_table;
CREATE TRIGGER schema_table_auto_short_code_trigger
  BEFORE INSERT ON public.schema_table
  FOR EACH ROW EXECUTE FUNCTION public.schema_table_auto_short_code();

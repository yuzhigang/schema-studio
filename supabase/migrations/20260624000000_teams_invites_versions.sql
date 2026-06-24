-- Migration: teams, invites, project-level access, table versions, ref_table_id

-- 1. Auto-create profile + default personal team on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  INSERT INTO public.profile (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.team (name, slug)
  VALUES ('我的团队', NULL)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_member (team_id, user_id, role)
  VALUES (v_team_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Team invites
CREATE TABLE IF NOT EXISTS public.team_invite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profile(id),
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','admin','editor','viewer')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invite_token ON public.team_invite(token);
CREATE INDEX IF NOT EXISTS idx_team_invite_team ON public.team_invite(team_id);

ALTER TABLE public.team_invite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team admins manage invites" ON public.team_invite;
CREATE POLICY "team admins manage invites"
  ON public.team_invite FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_member
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
        AND deleted_at IS NULL
    )
  );

-- 3. Project-level members
CREATE TABLE IF NOT EXISTS public.project_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.project(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_member_project ON public.project_member(project_id);
CREATE INDEX IF NOT EXISTS idx_project_member_user ON public.project_member(user_id);

ALTER TABLE public.project_member ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team admins manage project members" ON public.project_member;
CREATE POLICY "team admins manage project members"
  ON public.project_member FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM public.project p
      JOIN public.team_member tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
        AND tm.deleted_at IS NULL
    )
  );

-- 4. Table versioning + ref_table_id
ALTER TABLE public.schema_table
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_selected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version_group_id uuid REFERENCES public.schema_table(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ref_table_id uuid REFERENCES public.schema_table(id) ON DELETE SET NULL;

UPDATE public.schema_table
SET version_group_id = id
WHERE version_group_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_table_selected_version
  ON public.schema_table(version_group_id)
  WHERE version_selected = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schema_table_version_group ON public.schema_table(version_group_id);
CREATE INDEX IF NOT EXISTS idx_schema_table_ref ON public.schema_table(ref_table_id);

-- 5. Updated-at triggers for new tables
DROP TRIGGER IF EXISTS team_invite_updated_at ON public.team_invite;
CREATE TRIGGER team_invite_updated_at
  BEFORE UPDATE ON public.team_invite
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS project_member_updated_at ON public.project_member;
CREATE TRIGGER project_member_updated_at
  BEFORE UPDATE ON public.project_member
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

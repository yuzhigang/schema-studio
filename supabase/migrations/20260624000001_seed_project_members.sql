-- Backfill: ensure every existing project's creator is a project admin member.
-- This fixes "Forbidden" when clicking projects that were created before the
-- project_member access model was introduced.

INSERT INTO public.project_member (project_id, user_id, role)
SELECT id, created_by, 'admin'
FROM public.project
WHERE created_by IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

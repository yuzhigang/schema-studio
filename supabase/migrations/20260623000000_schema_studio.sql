-- Schema Studio data model
-- All table names are singular. `schema_table` / `schema_column` are used because
-- `table` and `column` are SQL reserved words.

-- Idempotent enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
    create type public.entity_type as enum ('project', 'category', 'table', 'column');
  END IF;
END
$$;

-- 1. User extension
 create table if not exists public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2. Team
 create table if not exists public.team (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 3. Team membership
 create table if not exists public.team_member (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (team_id, user_id)
);

-- 4. Project
 create table if not exists public.project (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team(id) on delete cascade,
  name text not null,
  description text,
  color text,
  created_by uuid references public.profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 5. Category (corresponds to the UI folder/group). Nesting is supported via tree_node.
 create table if not exists public.category (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 6. Table
 create table if not exists public.schema_table (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  name text not null,
  logical_name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7. Column / field (belongs to exactly one table)
 create table if not exists public.schema_column (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.schema_table(id) on delete cascade,
  project_id uuid not null references public.project(id) on delete cascade,
  name text not null,
  logical_name text,
  data_type text not null default 'text',
  length int not null default 0,
  primary_key boolean not null default false,
  not_null boolean not null default false,
  auto_increment boolean not null default false,
  updated boolean not null default false,
  unique_flag boolean not null default false,
  default_value text,
  comment text,
  description text,
  fk_table_id uuid references public.schema_table(id) on delete set null,
  fk_column_id uuid references public.schema_column(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 8. Universal tree node
 create table if not exists public.tree_node (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  parent_id uuid references public.tree_node(id) on delete cascade,
  level int not null default 0,
  path_code text not null default '',
  children_count int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, id)
);

-- Only one active tree node per project entity
 create unique index if not exists idx_tree_node_active_entity
  on public.tree_node(project_id, entity_type, entity_id)
  where deleted_at is null;

-- Indexes
 create index if not exists idx_tree_node_project_path on public.tree_node(project_id, path_code);
create index if not exists idx_tree_node_parent on public.tree_node(parent_id);
create index if not exists idx_tree_node_entity on public.tree_node(entity_type, entity_id);
create index if not exists idx_tree_node_deleted on public.tree_node(deleted_at);

create index if not exists idx_schema_table_project on public.schema_table(project_id);
create index if not exists idx_schema_column_table on public.schema_column(table_id);
create index if not exists idx_schema_column_project on public.schema_column(project_id);
create index if not exists idx_category_project on public.category(project_id);

create index if not exists idx_team_member_user on public.team_member(user_id);
create index if not exists idx_project_team on public.project(team_id);

-- Validate parent and child belong to the same project via trigger (subqueries are not allowed in CHECK constraints)
 create or replace function public.tree_node_same_project_check()
returns trigger
language plpgsql
as $$
begin
  if NEW.parent_id is not null then
    if NEW.project_id != (select project_id from public.tree_node where id = NEW.parent_id) then
      raise exception 'parent and child must belong to the same project';
    end if;
  end if;
  return NEW;
end;
$$;

 drop trigger if exists tree_node_same_project_trigger on public.tree_node;
create trigger tree_node_same_project_trigger
  before insert or update on public.tree_node
  for each row execute function public.tree_node_same_project_check();

-- Helper: teams that the current user belongs to
 create or replace function public.user_team_ids()
returns setof uuid
language sql stable security definer
as $$
  select team_id from public.team_member where user_id = auth.uid();
$$;

-- RLS
 alter table public.profile enable row level security;
alter table public.team enable row level security;
alter table public.team_member enable row level security;
alter table public.project enable row level security;
alter table public.category enable row level security;
alter table public.schema_table enable row level security;
alter table public.schema_column enable row level security;
alter table public.tree_node enable row level security;

-- Profiles
 drop policy if exists "users can read/update own profile" on public.profile;
create policy "users can read/update own profile"
  on public.profile for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Teams
 drop policy if exists "team members can read their teams" on public.team;
create policy "team members can read their teams"
  on public.team for select
  using (id in (select public.user_team_ids()));

-- Projects
 drop policy if exists "team members can access their projects" on public.project;
create policy "team members can access their projects"
  on public.project for all
  using (team_id in (select public.user_team_ids()));

-- Entities scoped by project; RLS on project already enforces team membership
 drop policy if exists "team members can access project categories" on public.category;
create policy "team members can access project categories"
  on public.category for all
  using (project_id in (select id from public.project));

 drop policy if exists "team members can access project tables" on public.schema_table;
create policy "team members can access project tables"
  on public.schema_table for all
  using (project_id in (select id from public.project));

 drop policy if exists "team members can access project columns" on public.schema_column;
create policy "team members can access project columns"
  on public.schema_column for all
  using (project_id in (select id from public.project));

 drop policy if exists "team members can access project tree_nodes" on public.tree_node;
create policy "team members can access project tree_nodes"
  on public.tree_node for all
  using (project_id in (select id from public.project));

-- Updated-at trigger
 create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists profile_updated_at on public.profile;
create trigger profile_updated_at before update on public.profile
  for each row execute function public.set_updated_at();

drop trigger if exists team_updated_at on public.team;
create trigger team_updated_at before update on public.team
  for each row execute function public.set_updated_at();

drop trigger if exists team_member_updated_at on public.team_member;
create trigger team_member_updated_at before update on public.team_member
  for each row execute function public.set_updated_at();

drop trigger if exists project_updated_at on public.project;
create trigger project_updated_at before update on public.project
  for each row execute function public.set_updated_at();

drop trigger if exists category_updated_at on public.category;
create trigger category_updated_at before update on public.category
  for each row execute function public.set_updated_at();

drop trigger if exists schema_table_updated_at on public.schema_table;
create trigger schema_table_updated_at before update on public.schema_table
  for each row execute function public.set_updated_at();

drop trigger if exists schema_column_updated_at on public.schema_column;
create trigger schema_column_updated_at before update on public.schema_column
  for each row execute function public.set_updated_at();

drop trigger if exists tree_node_updated_at on public.tree_node;
create trigger tree_node_updated_at before update on public.tree_node
  for each row execute function public.set_updated_at();

-- Maintain children_count automatically
 create or replace function public.tree_node_children_count_maintain()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.parent_id is not null and NEW.deleted_at is null then
      update public.tree_node
      set children_count = children_count + 1
      where id = NEW.parent_id;
    end if;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    if OLD.parent_id is not null and OLD.deleted_at is null then
      update public.tree_node
      set children_count = greatest(children_count - 1, 0)
      where id = OLD.parent_id;
    end if;
    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    -- soft delete
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      if NEW.parent_id is not null then
        update public.tree_node
        set children_count = greatest(children_count - 1, 0)
        where id = NEW.parent_id;
      end if;
    end if;

    -- restore
    if OLD.deleted_at is not null and NEW.deleted_at is null then
      if NEW.parent_id is not null then
        update public.tree_node
        set children_count = children_count + 1
        where id = NEW.parent_id;
      end if;
    end if;

    -- active move
    if OLD.deleted_at is null and NEW.deleted_at is null
       and OLD.parent_id is distinct from NEW.parent_id then
      if OLD.parent_id is not null then
        update public.tree_node
        set children_count = greatest(children_count - 1, 0)
        where id = OLD.parent_id;
      end if;
      if NEW.parent_id is not null then
        update public.tree_node
        set children_count = children_count + 1
        where id = NEW.parent_id;
      end if;
    end if;

    return NEW;
  end if;

  return null;
end;
$$;

 drop trigger if exists tree_node_children_count_trigger on public.tree_node;
create trigger tree_node_children_count_trigger
  after insert or update or delete on public.tree_node
  for each row execute function public.tree_node_children_count_maintain();

-- Soft-delete cascade: deleting a tree node also deletes its descendants and entity rows
 create or replace function public.tree_node_soft_delete_cascade()
returns trigger
language plpgsql
as $$
begin
  if OLD.deleted_at is null and NEW.deleted_at is not null then
    with recursive descendants as (
      select id, entity_type, entity_id
      from public.tree_node
      where parent_id = NEW.id
      union all
      select c.id, c.entity_type, c.entity_id
      from public.tree_node c
      join descendants d on c.parent_id = d.id
    )
    update public.tree_node
    set deleted_at = NEW.deleted_at
    where id in (select id from descendants);

    update public.category
    set deleted_at = NEW.deleted_at
    where id in (select entity_id from descendants where entity_type = 'category');

    update public.schema_table
    set deleted_at = NEW.deleted_at
    where id in (select entity_id from descendants where entity_type = 'table');

    update public.schema_column
    set deleted_at = NEW.deleted_at
    where id in (select entity_id from descendants where entity_type = 'column');
  end if;

  return NEW;
end;
$$;

 drop trigger if exists tree_node_soft_delete_cascade_trigger on public.tree_node;
create trigger tree_node_soft_delete_cascade_trigger
  after update of deleted_at on public.tree_node
  for each row execute function public.tree_node_soft_delete_cascade();

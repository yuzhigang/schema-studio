import type { Tables } from "@repo/db";
import { createSupabaseServerFromEnv } from "@repo/db/server";
import { createSupabaseSSR } from "@repo/db/ssr";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";

export const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export type ProjectAccessRole = "viewer" | "editor" | "admin" | "owner";
export type TeamRole = "viewer" | "editor" | "admin" | "owner";

export function applySSRHeaders(ssrHeaders: Headers) {
  const cookies = ssrHeaders.getSetCookie();
  if (cookies.length > 0) {
    setResponseHeader("Set-Cookie", cookies);
  }
}

export function getSSRSupabase() {
  const request = getRequest();
  if (!request) {
    throw new Error("No request available");
  }
  return createSupabaseSSR(request);
}

export async function getAuthenticatedUser() {
  const { supabase, headers } = getSSRSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    setResponseStatus(401);
    throw new Error("Unauthorized");
  }

  applySSRHeaders(headers);
  return user;
}

export function getServiceClient() {
  return createSupabaseServerFromEnv();
}

export async function assertTeamRole(userId: string, teamId: string, minRole: TeamRole = "viewer") {
  const service = getServiceClient();

  const { data: membership, error: membershipError } = await service
    .from("team_member")
    .select("role")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .maybeSingle();

  if (membershipError || !membership) {
    setResponseStatus(403);
    throw new Error("Forbidden");
  }

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    setResponseStatus(403);
    throw new Error("Forbidden");
  }

  return membership.role;
}

export async function assertTeamAdmin(userId: string, teamId: string) {
  return assertTeamRole(userId, teamId, "admin");
}

export async function assertProjectAccess(
  userId: string,
  projectId: string,
  minRole: ProjectAccessRole = "editor",
) {
  const service = getServiceClient();

  const { data: project, error: projectError } = await service
    .from("project")
    .select("team_id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    setResponseStatus(404);
    throw new Error("Project not found");
  }

  const { data: membership, error: membershipError } = await service
    .from("team_member")
    .select("role")
    .eq("user_id", userId)
    .eq("team_id", project.team_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (membershipError) {
    setResponseStatus(403);
    throw new Error("Forbidden");
  }

  // Team owners/admins have admin access to all team projects.
  if (membership && ROLE_RANK[membership.role] >= ROLE_RANK.admin) {
    return;
  }

  const { data: projectMembership, error: projectMembershipError } = await service
    .from("project_member")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (projectMembershipError) {
    setResponseStatus(403);
    throw new Error("Forbidden");
  }

  if (!projectMembership || ROLE_RANK[projectMembership.role] < ROLE_RANK[minRole]) {
    setResponseStatus(403);
    throw new Error("Forbidden");
  }
}

export async function assertProjectAdmin(userId: string, projectId: string) {
  return assertProjectAccess(userId, projectId, "admin");
}

export async function resolveTeamShortCode(
  service: ReturnType<typeof getServiceClient>,
  shortCode: string,
) {
  const { data, error } = await service
    .from("team")
    .select("id")
    .eq("short_code", shortCode)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    setResponseStatus(404);
    throw new Error("Team not found");
  }

  return data.id;
}

export async function resolveProjectShortCode(
  service: ReturnType<typeof getServiceClient>,
  shortCode: string,
) {
  const { data, error } = await service
    .from("project")
    .select("id, team_id")
    .eq("short_code", shortCode)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    setResponseStatus(404);
    throw new Error("Project not found");
  }

  return { id: data.id, teamId: data.team_id };
}

export async function resolveTableShortCode(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  shortCode: string,
) {
  const { data, error } = await service
    .from("schema_table")
    .select("id")
    .eq("project_id", projectId)
    .eq("short_code", shortCode)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    setResponseStatus(404);
    throw new Error("Table not found");
  }

  return data.id;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function resolveProjectId(
  service: ReturnType<typeof getServiceClient>,
  projectIdOrShortCode: string,
) {
  if (isUuid(projectIdOrShortCode)) {
    const { data, error } = await service
      .from("project")
      .select("id, team_id")
      .eq("id", projectIdOrShortCode)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      setResponseStatus(404);
      throw new Error("Project not found");
    }

    return { id: data.id, teamId: data.team_id };
  }

  return resolveProjectShortCode(service, projectIdOrShortCode);
}

export async function nextSortOrder(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  parentId: string | null,
): Promise<number> {
  let query = service
    .from("tree_node")
    .select("sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  return (data?.sort_order ?? 0) + 1;
}

export async function nextColumnSortOrder(
  service: ReturnType<typeof getServiceClient>,
  tableId: string,
): Promise<number> {
  const { data, error } = await service
    .from("schema_column")
    .select("sort_order")
    .eq("table_id", tableId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.sort_order ?? 0) + 1;
}

export async function findTreeNode(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  entityType: "category" | "table" | "column",
  entityId: string,
): Promise<Tables<"tree_node">["Row"] | null> {
  const { data, error } = await service
    .from("tree_node")
    .select("*")
    .eq("project_id", projectId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

const PATH_CODE_PAD = 4;

export function padOrder(order: number): string {
  return String(order).padStart(PATH_CODE_PAD, "0");
}

export function buildPathCode(parentPath: string | null, order: number): string {
  return parentPath ? `${parentPath}.${padOrder(order)}` : padOrder(order);
}

export async function rebuildNodeSubtree(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  nodeId: string,
  options: {
    parentPath: string | null;
    parentLevel: number;
    sortOrder: number;
  },
) {
  const { data: node, error } = await service
    .from("tree_node")
    .select("*")
    .eq("id", nodeId)
    .single();

  if (error || !node) {
    throw error ?? new Error("tree node not found");
  }

  const oldPath = node.path_code;
  const oldLevel = node.level;
  const newPath = buildPathCode(options.parentPath, options.sortOrder);
  const newLevel = options.parentLevel + 1;
  const levelDelta = newLevel - oldLevel;

  if (oldPath !== newPath || oldLevel !== newLevel || node.sort_order !== options.sortOrder) {
    const { error: updateError } = await service
      .from("tree_node")
      .update({
        sort_order: options.sortOrder,
        path_code: newPath,
        level: newLevel,
      })
      .eq("id", nodeId);

    if (updateError) {
      throw updateError;
    }
  }

  // Update descendants' path_code and level individually. This mirrors the
  // previous browser implementation; a batch SQL update can be added later if
  // profiling shows it is needed.
  const { data: descendants, error: descError } = await service
    .from("tree_node")
    .select("id, path_code, level")
    .eq("project_id", projectId)
    .like("path_code", `${oldPath}.%`)
    .is("deleted_at", null);

  if (descError) {
    throw descError;
  }

  for (const descendant of descendants ?? []) {
    const suffix = descendant.path_code.slice(oldPath.length + 1);
    const nextPath = `${newPath}.${suffix}`;
    const { error: e } = await service
      .from("tree_node")
      .update({
        path_code: nextPath,
        level: descendant.level + levelDelta,
      })
      .eq("id", descendant.id);

    if (e) {
      throw e;
    }
  }
}

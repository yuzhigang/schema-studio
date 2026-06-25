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

async function runChunked<T>(
  items: T[],
  size: number,
  task: (item: T, index: number) => Promise<void>,
) {
  for (let start = 0; start < items.length; start += size) {
    const chunk = items.slice(start, start + size);
    await Promise.all(chunk.map((item, offset) => task(item, start + offset)));
  }
}

/**
 * Reorder a set of sibling tree nodes in a single fetch + a few concurrent write
 * batches, instead of one sequential `findTreeNode` + `rebuildNodeSubtree`
 * round-trip per item. All new `path_code`/`level`/`sort_order` values are
 * computed in memory against one snapshot, then written with bounded
 * concurrency. Each write is the same single-row `path_code`/`level`/`sort_order`
 * UPDATE as before, so the children-count and soft-delete triggers stay inert.
 */
export async function reorderSiblingsBatched(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  params: {
    entityType: "category" | "table" | "column";
    orderedEntityIds: string[];
    parentPath: string | null;
    parentLevel: number;
  },
): Promise<void> {
  const { data: nodes, error } = await service
    .from("tree_node")
    .select("id, entity_type, entity_id, path_code, level, sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
  if (!nodes || nodes.length === 0) {
    return;
  }

  const nodeByEntity = new Map<string, (typeof nodes)[number]>();
  for (const node of nodes) {
    nodeByEntity.set(`${node.entity_type}:${node.entity_id}`, node);
  }

  const newLevel = params.parentLevel + 1;
  const updates = new Map<string, { path_code: string; level: number; sort_order: number }>();

  params.orderedEntityIds.forEach((entityId, index) => {
    const node = nodeByEntity.get(`${params.entityType}:${entityId}`);
    if (!node) {
      return;
    }

    const sortOrder = index + 1;
    const oldPath = node.path_code;
    const newPath = buildPathCode(params.parentPath, sortOrder);
    const levelDelta = newLevel - node.level;

    if (node.path_code !== newPath || node.level !== newLevel || node.sort_order !== sortOrder) {
      updates.set(node.id, { path_code: newPath, level: newLevel, sort_order: sortOrder });
    }

    if (oldPath === newPath && levelDelta === 0) {
      return;
    }

    const prefix = `${oldPath}.`;
    for (const descendant of nodes) {
      if (!descendant.path_code.startsWith(prefix)) {
        continue;
      }
      const suffix = descendant.path_code.slice(oldPath.length + 1);
      updates.set(descendant.id, {
        path_code: `${newPath}.${suffix}`,
        level: descendant.level + levelDelta,
        sort_order: descendant.sort_order,
      });
    }
  });

  const entries = Array.from(updates.entries());
  await runChunked(entries, 25, async ([id, patch]) => {
    const { error: updateError } = await service.from("tree_node").update(patch).eq("id", id);
    if (updateError) {
      throw updateError;
    }
  });
}

/** Update `schema_column.sort_order` for an ordered list in bounded-concurrency batches. */
export async function reorderColumnSortOrders(
  service: ReturnType<typeof getServiceClient>,
  orderedColumnIds: string[],
): Promise<void> {
  await runChunked(orderedColumnIds, 25, async (columnId, index) => {
    const { error } = await service
      .from("schema_column")
      .update({ sort_order: index + 1 })
      .eq("id", columnId);
    if (error) {
      throw error;
    }
  });
}

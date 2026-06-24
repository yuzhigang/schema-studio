import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  assertProjectAccess,
  assertProjectAdmin,
  buildPathCode,
  findTreeNode,
  getAuthenticatedUser,
  getServiceClient,
  nextColumnSortOrder,
  nextSortOrder,
  rebuildNodeSubtree,
  resolveProjectId,
  resolveTeamShortCode,
  ROLE_RANK,
} from "./helpers";
import { toSchemaField, toSchemaFolder, toSchemaProject, toSchemaTable } from "./mappers";

function newId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const $fetchProjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAuthenticatedUser();
  const service = getServiceClient();

  const { data: memberships, error: membershipError } = await service
    .from("team_member")
    .select("team_id, role")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (membershipError) {
    throw membershipError;
  }

  const teamIds = (memberships ?? []).map((m) => m.team_id);
  if (teamIds.length === 0) {
    return [];
  }

  const adminTeamIds = new Set(
    (memberships ?? []).filter((m) => ROLE_RANK[m.role] >= ROLE_RANK.admin).map((m) => m.team_id),
  );

  const { data: memberRows, error: memberError } = await service
    .from("project_member")
    .select("project_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (memberError) {
    throw memberError;
  }

  const memberProjectIds = new Set((memberRows ?? []).map((row) => row.project_id));

  const { data: projects, error } = await service
    .from("project")
    .select("*")
    .in("team_id", teamIds)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    throw error;
  }

  const accessibleProjects = (projects ?? []).filter(
    (project) => adminTeamIds.has(project.team_id) || memberProjectIds.has(project.id),
  );

  if (accessibleProjects.length === 0) {
    return [];
  }

  const projectIds = accessibleProjects.map((p) => p.id);
  const { data: tables, error: tablesError } = await service
    .from("schema_table")
    .select("project_id")
    .in("project_id", projectIds)
    .is("deleted_at", null);

  if (tablesError) {
    throw tablesError;
  }

  const counts = new Map<string, number>();
  for (const table of tables ?? []) {
    counts.set(table.project_id, (counts.get(table.project_id) ?? 0) + 1);
  }

  return accessibleProjects.map((project) => toSchemaProject(project, counts.get(project.id) ?? 0));
});

const teamShortCodeSchema = z.object({
  teamShortCode: z.string().min(1),
});

export const $fetchTeamProjectsByShortCode = createServerFn({ method: "POST" })
  .inputValidator(teamShortCodeSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const teamId = await resolveTeamShortCode(service, data.teamShortCode);

    const { data: membership, error: membershipError } = await service
      .from("team_member")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (membershipError || !membership) {
      setResponseStatus(403);
      throw new Error("Forbidden");
    }

    const isAdmin = ROLE_RANK[membership.role] >= ROLE_RANK.admin;

    const { data: memberRows, error: memberError } = await service
      .from("project_member")
      .select("project_id")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (memberError) {
      throw memberError;
    }

    const memberProjectIds = new Set((memberRows ?? []).map((row) => row.project_id));

    const { data: projects, error } = await service
      .from("project")
      .select("*")
      .eq("team_id", teamId)
      .is("deleted_at", null)
      .order("name");

    if (error) {
      throw error;
    }

    const accessibleProjects = isAdmin
      ? (projects ?? [])
      : (projects ?? []).filter((project) => memberProjectIds.has(project.id));

    if (accessibleProjects.length === 0) {
      return [];
    }

    const projectIds = accessibleProjects.map((p) => p.id);
    const { data: tables, error: tablesError } = await service
      .from("schema_table")
      .select("project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null);

    if (tablesError) {
      throw tablesError;
    }

    const counts = new Map<string, number>();
    for (const table of tables ?? []) {
      counts.set(table.project_id, (counts.get(table.project_id) ?? 0) + 1);
    }

    return accessibleProjects.map((project) =>
      toSchemaProject(project, counts.get(project.id) ?? 0),
    );
  });

const projectIdOrShortCodeSchema = z.object({
  projectId: z.string().min(1),
});

export const $fetchProjectTree = createServerFn({ method: "POST" })
  .inputValidator(projectIdOrShortCodeSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const project = await resolveProjectId(service, data.projectId);
    await assertProjectAccess(user.id, project.id, "viewer");

    const [{ data: nodes }, { data: categories }, { data: tables }, { data: columns }] =
      await Promise.all([
        service
          .from("tree_node")
          .select("*")
          .eq("project_id", project.id)
          .is("deleted_at", null)
          .order("path_code"),
        service.from("category").select("*").eq("project_id", project.id).is("deleted_at", null),
        service
          .from("schema_table")
          .select("*")
          .eq("project_id", project.id)
          .is("deleted_at", null),
        service
          .from("schema_column")
          .select("*")
          .eq("project_id", project.id)
          .is("deleted_at", null)
          .order("sort_order"),
      ]);

    if (!nodes || !categories || !tables || !columns) {
      return [];
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const tableMap = new Map(tables.map((table) => [table.id, table]));
    const columnMap = new Map(columns.map((column) => [column.id, column]));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const folderByNodeId = new Map<string, ReturnType<typeof toSchemaFolder>>();
    const tableByNodeId = new Map<string, ReturnType<typeof toSchemaTable>>();
    const rootFolders: ReturnType<typeof toSchemaFolder>[] = [];

    for (const node of nodes) {
      if (node.entity_type !== "category" || node.parent_id !== null) {
        continue;
      }

      const category = categoryMap.get(node.entity_id);
      if (!category) {
        continue;
      }

      const folder = toSchemaFolder(category, []);
      folderByNodeId.set(node.id, folder);
      rootFolders.push(folder);
    }

    for (const node of nodes) {
      if (node.entity_type === "table") {
        const parentNode = nodeMap.get(node.parent_id ?? "");
        if (!parentNode || parentNode.entity_type !== "category") {
          continue;
        }

        const folder = folderByNodeId.get(parentNode.id);
        if (!folder) {
          continue;
        }

        const tableRow = tableMap.get(node.entity_id);
        if (!tableRow) {
          continue;
        }

        const table = toSchemaTable(tableRow, []);
        tableByNodeId.set(node.id, table);
        folder.tables.push(table);
      }

      if (node.entity_type === "column") {
        const parentNode = nodeMap.get(node.parent_id ?? "");
        if (!parentNode || parentNode.entity_type !== "table") {
          continue;
        }

        const table = tableByNodeId.get(parentNode.id);
        if (!table) {
          continue;
        }

        const columnRow = columnMap.get(node.entity_id);
        if (!columnRow) {
          continue;
        }

        table.fields.push(toSchemaField(columnRow));
      }
    }

    for (const folder of rootFolders) {
      folder.count = folder.tables.length;
    }

    return rootFolders;
  });

// ---------------------------------------------------------------------------
// Creates
// ---------------------------------------------------------------------------

const createCategorySchema = z.object({
  projectId: z.uuid(),
  name: z.string().min(1),
  parentId: z.uuid().nullable().optional(),
});

export const $createCategory = createServerFn({ method: "POST" })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const { data: category, error } = await service
      .from("category")
      .insert({ project_id: data.projectId, name: data.name })
      .select("id")
      .single();

    if (error || !category) {
      throw error ?? new Error("create category failed");
    }

    let parentNode = null;
    if (data.parentId) {
      parentNode = await findTreeNode(service, data.projectId, "category", data.parentId);
    }

    const sortOrder = await nextSortOrder(service, data.projectId, parentNode?.id ?? null);
    const pathCode = buildPathCode(parentNode?.path_code ?? null, sortOrder);
    const level = (parentNode?.level ?? -1) + 1;

    const { error: nodeError } = await service.from("tree_node").insert({
      project_id: data.projectId,
      entity_type: "category",
      entity_id: category.id,
      parent_id: parentNode?.id ?? null,
      sort_order: sortOrder,
      path_code: pathCode,
      level,
    });

    if (nodeError) {
      throw nodeError;
    }

    return category.id;
  });

const tableMetadataSchema = z.object({
  name: z.string().min(1),
  logicalName: z.string(),
  description: z.string(),
});

const createTableSchema = z.object({
  projectId: z.uuid(),
  folderId: z.uuid(),
  metadata: tableMetadataSchema,
});

export const $createTable = createServerFn({ method: "POST" })
  .inputValidator(createTableSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const tableId = newId();

    const { error } = await service.from("schema_table").insert({
      id: tableId,
      project_id: data.projectId,
      name: data.metadata.name,
      logical_name: data.metadata.logicalName,
      description: data.metadata.description,
      version: 1,
      version_selected: true,
      version_group_id: tableId,
    });

    if (error) {
      throw error ?? new Error("create table failed");
    }

    const folderNode = await findTreeNode(service, data.projectId, "category", data.folderId);
    if (!folderNode) {
      throw new Error("folder not found");
    }

    const sortOrder = await nextSortOrder(service, data.projectId, folderNode.id);
    const pathCode = buildPathCode(folderNode.path_code, sortOrder);
    const level = folderNode.level + 1;

    const { error: nodeError } = await service.from("tree_node").insert({
      project_id: data.projectId,
      entity_type: "table",
      entity_id: tableId,
      parent_id: folderNode.id,
      sort_order: sortOrder,
      path_code: pathCode,
      level,
    });

    if (nodeError) {
      throw nodeError;
    }

    return tableId;
  });

const createColumnSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
  field: z
    .object({
      name: z.string().optional(),
      logicalName: z.string().optional(),
      dataType: z.string().optional(),
      length: z.number().optional(),
      primaryKey: z.boolean().optional(),
      nullable: z.boolean().optional(),
      autoIncrement: z.boolean().optional(),
      index: z.boolean().optional(),
      uniqueFlag: z.boolean().optional(),
      defaultValue: z.string().nullable().optional(),
      comment: z.string().nullable().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export const $createColumn = createServerFn({ method: "POST" })
  .inputValidator(createColumnSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const columnSortOrder = await nextColumnSortOrder(service, data.tableId);
    const field = data.field ?? {};

    const { data: column, error } = await service
      .from("schema_column")
      .insert({
        project_id: data.projectId,
        table_id: data.tableId,
        name: field.name ?? "NewField",
        logical_name: field.logicalName ?? "新字段",
        data_type: field.dataType ?? "text",
        length: field.length ?? 64,
        primary_key: field.primaryKey ?? false,
        not_null: field.nullable === undefined ? false : !field.nullable,
        auto_increment: field.autoIncrement ?? false,
        index: field.index ?? false,
        unique_flag: field.uniqueFlag ?? false,
        default_value: field.defaultValue ?? null,
        comment: field.comment ?? null,
        description: field.description ?? null,
        sort_order: columnSortOrder,
      })
      .select("id")
      .single();

    if (error || !column) {
      throw error ?? new Error("create column failed");
    }

    const tableNode = await findTreeNode(service, data.projectId, "table", data.tableId);
    if (!tableNode) {
      throw new Error("table not found");
    }

    const sortOrder = await nextSortOrder(service, data.projectId, tableNode.id);
    const pathCode = buildPathCode(tableNode.path_code, sortOrder);
    const level = tableNode.level + 1;

    const { error: nodeError } = await service.from("tree_node").insert({
      project_id: data.projectId,
      entity_type: "column",
      entity_id: column.id,
      parent_id: tableNode.id,
      sort_order: sortOrder,
      path_code: pathCode,
      level,
    });

    if (nodeError) {
      throw nodeError;
    }

    return column.id;
  });

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

const updateTableSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
  metadata: tableMetadataSchema,
});

export const $updateTable = createServerFn({ method: "POST" })
  .inputValidator(updateTableSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const { error } = await service
      .from("schema_table")
      .update({
        name: data.metadata.name,
        logical_name: data.metadata.logicalName,
        description: data.metadata.description,
      })
      .eq("id", data.tableId);

    if (error) {
      throw error;
    }
  });

const updateColumnSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
  patch: z.object({
    name: z.string().optional(),
    logicalName: z.string().optional(),
    dataType: z.string().optional(),
    length: z.number().optional(),
    primaryKey: z.boolean().optional(),
    nullable: z.boolean().optional(),
    autoIncrement: z.boolean().optional(),
    index: z.boolean().optional(),
    uniqueFlag: z.boolean().optional(),
    defaultValue: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    description: z.string().optional(),
  }),
});

export const $updateColumn = createServerFn({ method: "POST" })
  .inputValidator(updateColumnSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const { error } = await service
      .from("schema_column")
      .update({
        name: data.patch.name,
        logical_name: data.patch.logicalName,
        data_type: data.patch.dataType,
        length: data.patch.length,
        primary_key: data.patch.primaryKey,
        not_null: data.patch.nullable === undefined ? undefined : !data.patch.nullable,
        auto_increment: data.patch.autoIncrement,
        index: data.patch.index,
        unique_flag: data.patch.uniqueFlag,
        default_value: data.patch.defaultValue,
        comment: data.patch.comment,
        description: data.patch.description,
      })
      .eq("id", data.columnId);

    if (error) {
      throw error;
    }
  });

// ---------------------------------------------------------------------------
// Soft deletes
// ---------------------------------------------------------------------------

const deleteCategorySchema = z.object({
  projectId: z.uuid(),
  categoryId: z.uuid(),
});

export const $deleteCategory = createServerFn({ method: "POST" })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const now = new Date().toISOString();

    const [{ error: entityError }, { error: nodeError }] = await Promise.all([
      service.from("category").update({ deleted_at: now }).eq("id", data.categoryId),
      service
        .from("tree_node")
        .update({ deleted_at: now })
        .eq("entity_type", "category")
        .eq("entity_id", data.categoryId),
    ]);

    if (entityError) {
      throw entityError;
    }
    if (nodeError) {
      throw nodeError;
    }
  });

const deleteTableSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
});

export const $deleteTable = createServerFn({ method: "POST" })
  .inputValidator(deleteTableSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const now = new Date().toISOString();

    const [{ error: entityError }, { error: nodeError }] = await Promise.all([
      service.from("schema_table").update({ deleted_at: now }).eq("id", data.tableId),
      service
        .from("tree_node")
        .update({ deleted_at: now })
        .eq("entity_type", "table")
        .eq("entity_id", data.tableId),
    ]);

    if (entityError) {
      throw entityError;
    }
    if (nodeError) {
      throw nodeError;
    }
  });

const deleteColumnSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
});

export const $deleteColumn = createServerFn({ method: "POST" })
  .inputValidator(deleteColumnSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const now = new Date().toISOString();

    const [{ error: entityError }, { error: nodeError }] = await Promise.all([
      service.from("schema_column").update({ deleted_at: now }).eq("id", data.columnId),
      service
        .from("tree_node")
        .update({ deleted_at: now })
        .eq("entity_type", "column")
        .eq("entity_id", data.columnId),
    ]);

    if (entityError) {
      throw entityError;
    }
    if (nodeError) {
      throw nodeError;
    }
  });

// ---------------------------------------------------------------------------
// Reorder / move
// ---------------------------------------------------------------------------

const reorderCategoriesSchema = z.object({
  projectId: z.uuid(),
  orderedCategoryIds: z.array(z.uuid()),
});

export const $reorderCategories = createServerFn({ method: "POST" })
  .inputValidator(reorderCategoriesSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    for (let index = 0; index < data.orderedCategoryIds.length; index++) {
      const categoryId = data.orderedCategoryIds[index];
      const node = await findTreeNode(service, data.projectId, "category", categoryId);
      if (!node) {
        continue;
      }

      await rebuildNodeSubtree(service, data.projectId, node.id, {
        parentPath: null,
        parentLevel: -1,
        sortOrder: index + 1,
      });
    }
  });

const reorderTablesSchema = z.object({
  projectId: z.uuid(),
  folderId: z.uuid(),
  orderedTableIds: z.array(z.uuid()),
});

export const $reorderTables = createServerFn({ method: "POST" })
  .inputValidator(reorderTablesSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const folderNode = await findTreeNode(service, data.projectId, "category", data.folderId);
    if (!folderNode) {
      return;
    }

    for (let index = 0; index < data.orderedTableIds.length; index++) {
      const tableId = data.orderedTableIds[index];
      const node = await findTreeNode(service, data.projectId, "table", tableId);
      if (!node) {
        continue;
      }

      await rebuildNodeSubtree(service, data.projectId, node.id, {
        parentPath: folderNode.path_code,
        parentLevel: folderNode.level,
        sortOrder: index + 1,
      });
    }
  });

const reorderColumnsSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
  orderedColumnIds: z.array(z.uuid()),
});

export const $reorderColumns = createServerFn({ method: "POST" })
  .inputValidator(reorderColumnsSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const tableNode = await findTreeNode(service, data.projectId, "table", data.tableId);
    if (!tableNode) {
      return;
    }

    for (let index = 0; index < data.orderedColumnIds.length; index++) {
      const columnId = data.orderedColumnIds[index];
      const sortOrder = index + 1;

      const { error: columnError } = await service
        .from("schema_column")
        .update({ sort_order: sortOrder })
        .eq("id", columnId);

      if (columnError) {
        throw columnError;
      }

      const node = await findTreeNode(service, data.projectId, "column", columnId);
      if (!node) {
        continue;
      }

      await rebuildNodeSubtree(service, data.projectId, node.id, {
        parentPath: tableNode.path_code,
        parentLevel: tableNode.level,
        sortOrder,
      });
    }
  });

const moveTableToFolderSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
  targetFolderId: z.uuid(),
});

export const $moveTableToFolder = createServerFn({ method: "POST" })
  .inputValidator(moveTableToFolderSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const tableNode = await findTreeNode(service, data.projectId, "table", data.tableId);
    const folderNode = await findTreeNode(service, data.projectId, "category", data.targetFolderId);

    if (!tableNode || !folderNode) {
      return;
    }

    const { error } = await service
      .from("tree_node")
      .update({ parent_id: folderNode.id })
      .eq("id", tableNode.id);

    if (error) {
      throw error;
    }

    const sortOrder = await nextSortOrder(service, data.projectId, folderNode.id);
    await rebuildNodeSubtree(service, data.projectId, tableNode.id, {
      parentPath: folderNode.path_code,
      parentLevel: folderNode.level,
      sortOrder,
    });
  });

const moveColumnToTableSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
  targetTableId: z.uuid(),
});

export const $moveColumnToTable = createServerFn({ method: "POST" })
  .inputValidator(moveColumnToTableSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();
    const columnNode = await findTreeNode(service, data.projectId, "column", data.columnId);
    const tableNode = await findTreeNode(service, data.projectId, "table", data.targetTableId);

    if (!columnNode || !tableNode) {
      return;
    }

    const [{ error: columnError }, { error: nodeError }] = await Promise.all([
      service
        .from("schema_column")
        .update({ table_id: data.targetTableId })
        .eq("id", data.columnId),
      service.from("tree_node").update({ parent_id: tableNode.id }).eq("id", columnNode.id),
    ]);

    if (columnError) {
      throw columnError;
    }
    if (nodeError) {
      throw nodeError;
    }

    const sortOrder = await nextSortOrder(service, data.projectId, tableNode.id);
    await rebuildNodeSubtree(service, data.projectId, columnNode.id, {
      parentPath: tableNode.path_code,
      parentLevel: tableNode.level,
      sortOrder,
    });
  });

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  teamShortCode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  color: z.string().default("bg-blue-500"),
});

export const $createProject = createServerFn({ method: "POST" })
  .inputValidator(createProjectSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();

    const teamId = await resolveTeamShortCode(service, data.teamShortCode);

    const { data: membership, error: membershipError } = await service
      .from("team_member")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (membershipError || !membership) {
      throw new Error("Forbidden");
    }

    if (membership.role === "viewer") {
      throw new Error("Forbidden");
    }

    const { data: project, error } = await service
      .from("project")
      .insert({
        team_id: teamId,
        name: data.name,
        description: data.description || null,
        color: data.color,
        created_by: user.id,
      })
      .select("id, short_code")
      .single();

    if (error || !project) {
      throw error ?? new Error("create project failed");
    }

    const { error: memberError } = await service.from("project_member").insert({
      project_id: project.id,
      user_id: user.id,
      role: "admin",
    });

    if (memberError) {
      throw memberError;
    }

    return { id: project.id, shortCode: project.short_code ?? project.id };
  });

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

const fetchProjectMembersSchema = z.object({ projectId: z.uuid() });

export const $fetchProjectMembers = createServerFn({ method: "POST" })
  .inputValidator(fetchProjectMembersSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAdmin(user.id, data.projectId);

    const service = getServiceClient();
    const { data: members, error } = await service
      .from("project_member")
      .select("id, role, user:user_id(id, email, display_name)")
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (members ?? []).map((member) => {
      const user = member.user as unknown as {
        id: string;
        email: string;
        display_name: string | null;
      };
      return {
        id: member.id,
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        role: member.role as "admin" | "editor" | "viewer",
      };
    });
  });

const upsertProjectMemberSchema = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const $upsertProjectMember = createServerFn({ method: "POST" })
  .inputValidator(upsertProjectMemberSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAdmin(user.id, data.projectId);

    const service = getServiceClient();
    const { data: existing } = await service
      .from("project_member")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      const { error } = await service
        .from("project_member")
        .update({ role: data.role })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }

      return existing.id;
    }

    const { data: member, error } = await service
      .from("project_member")
      .insert({
        project_id: data.projectId,
        user_id: data.userId,
        role: data.role,
      })
      .select("id")
      .single();

    if (error || !member) {
      throw error ?? new Error("upsert project member failed");
    }

    return member.id;
  });

const removeProjectMemberSchema = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
});

export const $removeProjectMember = createServerFn({ method: "POST" })
  .inputValidator(removeProjectMemberSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAdmin(user.id, data.projectId);

    const service = getServiceClient();
    const now = new Date().toISOString();

    const { error } = await service
      .from("project_member")
      .update({ deleted_at: now })
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);

    if (error) {
      throw error;
    }
  });

async function rebuildTableColumnTreeNodes(
  service: ReturnType<typeof getServiceClient>,
  projectId: string,
  tableNodeId: string,
  tableId: string,
) {
  const { data: tableNode, error: nodeError } = await service
    .from("tree_node")
    .select("path_code, level")
    .eq("id", tableNodeId)
    .single();

  if (nodeError || !tableNode) {
    throw nodeError ?? new Error("table tree node not found");
  }

  const now = new Date().toISOString();

  await service
    .from("tree_node")
    .update({ deleted_at: now })
    .eq("parent_id", tableNodeId)
    .eq("entity_type", "column")
    .is("deleted_at", null);

  const { data: columns } = await service
    .from("schema_column")
    .select("id")
    .eq("table_id", tableId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order");

  if (columns && columns.length > 0) {
    const columnNodes = columns.map((column, index) => ({
      id: newId(),
      project_id: projectId,
      entity_type: "column" as const,
      entity_id: column.id,
      parent_id: tableNodeId,
      level: tableNode.level + 1,
      path_code: buildPathCode(tableNode.path_code, index + 1),
      children_count: 0,
      sort_order: index + 1,
      created_at: now,
      updated_at: now,
    }));

    const { error: insertError } = await service.from("tree_node").insert(columnNodes);
    if (insertError) {
      throw insertError;
    }
  }

  await service
    .from("tree_node")
    .update({ children_count: columns?.length ?? 0 })
    .eq("id", tableNodeId);
}

// ---------------------------------------------------------------------------
// Table versions
// ---------------------------------------------------------------------------

const tableIdSchema = z.object({
  projectId: z.uuid(),
  tableId: z.uuid(),
});

export const $createTableVersion = createServerFn({ method: "POST" })
  .inputValidator(tableIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();

    const { data: currentTable, error: tableError } = await service
      .from("schema_table")
      .select("*")
      .eq("id", data.tableId)
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .single();

    if (tableError || !currentTable) {
      throw tableError ?? new Error("table not found");
    }

    const versionGroupId = currentTable.version_group_id ?? currentTable.id;

    const { data: maxVersionRow } = await service
      .from("schema_table")
      .select("version")
      .eq("version_group_id", versionGroupId)
      .is("deleted_at", null)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (maxVersionRow?.version ?? 1) + 1;
    const newTableId = newId();
    const now = new Date().toISOString();

    const { error: deselectError } = await service
      .from("schema_table")
      .update({ version_selected: false })
      .eq("version_group_id", versionGroupId)
      .is("deleted_at", null);

    if (deselectError) {
      throw deselectError;
    }

    const { error: insertError } = await service.from("schema_table").insert({
      id: newTableId,
      project_id: data.projectId,
      name: currentTable.name,
      logical_name: currentTable.logical_name,
      description: currentTable.description,
      version: nextVersion,
      version_selected: true,
      version_group_id: versionGroupId,
      ref_table_id: currentTable.ref_table_id,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw insertError;
    }

    const { data: columns } = await service
      .from("schema_column")
      .select("*")
      .eq("table_id", data.tableId)
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .order("sort_order");

    if (columns && columns.length > 0) {
      const newColumns = columns.map((column) => ({
        id: newId(),
        project_id: data.projectId,
        table_id: newTableId,
        name: column.name,
        logical_name: column.logical_name,
        data_type: column.data_type,
        length: column.length,
        primary_key: column.primary_key,
        not_null: column.not_null,
        auto_increment: column.auto_increment,
        index: column.index,
        unique_flag: column.unique_flag,
        default_value: column.default_value,
        comment: column.comment,
        description: column.description,
        fk_table_id: column.fk_table_id,
        fk_column_id: column.fk_column_id,
        sort_order: column.sort_order,
        created_at: now,
        updated_at: now,
      }));

      const { error: columnError } = await service.from("schema_column").insert(newColumns);
      if (columnError) {
        throw columnError;
      }
    }

    const { data: tableNode } = await service
      .from("tree_node")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("entity_type", "table")
      .eq("entity_id", data.tableId)
      .is("deleted_at", null)
      .maybeSingle();

    if (tableNode) {
      const { error: nodeError } = await service
        .from("tree_node")
        .update({ entity_id: newTableId })
        .eq("id", tableNode.id);

      if (nodeError) {
        throw nodeError;
      }

      await rebuildTableColumnTreeNodes(service, data.projectId, tableNode.id, newTableId);
    }

    const { data: newTable } = await service
      .from("schema_table")
      .select("short_code")
      .eq("id", newTableId)
      .single();

    return {
      tableId: newTableId,
      shortCode: newTable?.short_code ?? newTableId,
      version: nextVersion,
    };
  });

export const $setSelectedTableVersion = createServerFn({ method: "POST" })
  .inputValidator(tableIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();

    const { data: targetTable, error } = await service
      .from("schema_table")
      .select("version_group_id")
      .eq("id", data.tableId)
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .single();

    if (error || !targetTable) {
      throw error ?? new Error("table not found");
    }

    const versionGroupId = targetTable.version_group_id ?? data.tableId;

    const { data: groupRows } = await service
      .from("schema_table")
      .select("id")
      .eq("version_group_id", versionGroupId)
      .is("deleted_at", null);

    const groupIds = (groupRows ?? []).map((row) => row.id);

    const { error: deselectError } = await service
      .from("schema_table")
      .update({ version_selected: false })
      .eq("version_group_id", versionGroupId)
      .is("deleted_at", null);

    if (deselectError) {
      throw deselectError;
    }

    const { error: selectError } = await service
      .from("schema_table")
      .update({ version_selected: true })
      .eq("id", data.tableId);

    if (selectError) {
      throw selectError;
    }

    const { data: tableNode } = await service
      .from("tree_node")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("entity_type", "table")
      .in("entity_id", groupIds)
      .is("deleted_at", null)
      .maybeSingle();

    if (tableNode) {
      const { error: nodeError } = await service
        .from("tree_node")
        .update({ entity_id: data.tableId })
        .eq("id", tableNode.id);

      if (nodeError) {
        throw nodeError;
      }

      await rebuildTableColumnTreeNodes(service, data.projectId, tableNode.id, data.tableId);
    }
  });

export const $listTableVersions = createServerFn({ method: "POST" })
  .inputValidator(tableIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "viewer");

    const service = getServiceClient();

    const { data: currentTable, error } = await service
      .from("schema_table")
      .select("version_group_id")
      .eq("id", data.tableId)
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .single();

    if (error || !currentTable) {
      throw error ?? new Error("table not found");
    }

    const versionGroupId = currentTable.version_group_id ?? data.tableId;

    const { data: versions, error: versionsError } = await service
      .from("schema_table")
      .select(
        "id, name, logical_name, description, version, version_selected, short_code, created_at",
      )
      .eq("version_group_id", versionGroupId)
      .is("deleted_at", null)
      .order("version", { ascending: false });

    if (versionsError) {
      throw versionsError;
    }

    return (versions ?? []).map((row) => ({
      id: row.id,
      shortCode: row.short_code ?? row.id,
      name: row.name,
      logicalName: row.logical_name ?? "",
      description: row.description ?? "",
      version: row.version,
      versionSelected: row.version_selected,
      createdAt: row.created_at,
    }));
  });

export const $syncTableFromRef = createServerFn({ method: "POST" })
  .inputValidator(tableIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    await assertProjectAccess(user.id, data.projectId, "editor");

    const service = getServiceClient();

    const { data: table, error } = await service
      .from("schema_table")
      .select("ref_table_id")
      .eq("id", data.tableId)
      .eq("project_id", data.projectId)
      .is("deleted_at", null)
      .single();

    if (error || !table) {
      throw error ?? new Error("table not found");
    }

    if (!table.ref_table_id) {
      throw new Error("该表没有关联的源表");
    }

    const { data: refTable, error: refError } = await service
      .from("schema_table")
      .select("name, logical_name, description")
      .eq("id", table.ref_table_id)
      .is("deleted_at", null)
      .single();

    if (refError || !refTable) {
      throw refError ?? new Error("源表不存在");
    }

    const { error: updateError } = await service
      .from("schema_table")
      .update({
        name: refTable.name,
        logical_name: refTable.logical_name,
        description: refTable.description,
      })
      .eq("id", data.tableId);

    if (updateError) {
      throw updateError;
    }
  });

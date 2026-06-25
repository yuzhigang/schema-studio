import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  inferImportFormat,
  parseSchemaFile,
  type ImportFileFormat,
  type ParsedSchemaFolder,
  type ParsedSchemaTable,
} from "#/lib/schema-import";

import { buildPathCode, getAuthenticatedUser, getServiceClient } from "./helpers";

function newId() {
  return crypto.randomUUID();
}

async function getOrCreateDefaultTeam(
  service: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<string> {
  const { data: memberships, error: membershipError } = await service
    .from("team_member")
    .select("team_id, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) {
    throw membershipError;
  }

  if (memberships && memberships.length > 0) {
    return memberships[0].team_id;
  }

  const teamId = newId();
  const now = new Date().toISOString();

  const { error: teamError } = await service.from("team").insert({
    id: teamId,
    name: "我的团队",
    slug: null,
    created_at: now,
    updated_at: now,
  });

  if (teamError) {
    throw teamError;
  }

  const { error: memberError } = await service.from("team_member").insert({
    team_id: teamId,
    user_id: userId,
    role: "owner",
    created_at: now,
    updated_at: now,
  });

  if (memberError) {
    throw memberError;
  }

  return teamId;
}

const importProjectSchema = z.object({
  content: z.string(),
  format: z.enum(["dmj", "sql"]),
  fileName: z.string(),
});

export const $importProject = createServerFn({ method: "POST" })
  .inputValidator(importProjectSchema)
  .handler(async ({ data }) => {
    const user = await getAuthenticatedUser();
    const service = getServiceClient();
    const teamId = await getOrCreateDefaultTeam(service, user.id);

    const format = inferImportFormat(data.fileName);
    if (format !== data.format) {
      throw new Error("文件格式与声明的格式不一致");
    }

    const parsed = parseSchemaFile(format as ImportFileFormat, data.content, data.fileName);
    const projectId = newId();
    const now = new Date().toISOString();

    const { error: projectError } = await service.from("project").insert({
      id: projectId,
      team_id: teamId,
      name: parsed.name,
      description: parsed.description,
      color: "bg-blue-500",
      created_by: user.id,
      created_at: now,
      updated_at: now,
    });

    if (projectError) {
      throw projectError;
    }

    const { error: memberError } = await service.from("project_member").insert({
      project_id: projectId,
      user_id: user.id,
      role: "admin",
    });

    if (memberError) {
      throw memberError;
    }

    if (parsed.folders.length === 0) {
      return { projectId };
    }

    type FolderState = {
      nodeId: string;
      entityId: string;
      pathCode: string;
      folder: ParsedSchemaFolder;
    };

    type TableState = {
      nodeId: string;
      entityId: string;
      pathCode: string;
      folderNodeId: string;
      table: ParsedSchemaTable;
    };

    const folderStates: FolderState[] = parsed.folders.map((folder) => ({
      nodeId: newId(),
      entityId: newId(),
      pathCode: buildPathCode(null, folder.sortOrder),
      folder,
    }));

    const tableStates: TableState[] = [];
    for (const folderState of folderStates) {
      for (const table of folderState.folder.tables) {
        tableStates.push({
          nodeId: newId(),
          entityId: newId(),
          pathCode: buildPathCode(folderState.pathCode, table.sortOrder),
          folderNodeId: folderState.nodeId,
          table,
        });
      }
    }

    const fieldStates: {
      entityId: string;
      tableEntityId: string;
      tableNodeId: string;
      pathCode: string;
      field: {
        name: string;
        logicalName: string;
        description: string;
        dataType: string;
        length: number;
        primaryKey: boolean;
        nullable: boolean;
        autoIncrement: boolean;
        index: boolean;
        uniqueFlag: boolean;
        defaultValue: string | null;
        sortOrder: number;
      };
    }[] = [];

    for (const tableState of tableStates) {
      for (const field of tableState.table.fields) {
        fieldStates.push({
          entityId: newId(),
          tableEntityId: tableState.entityId,
          tableNodeId: tableState.nodeId,
          pathCode: buildPathCode(tableState.pathCode, field.sortOrder),
          field,
        });
      }
    }

    const { error: categoryError } = await service.from("category").insert(
      folderStates.map((folderState) => ({
        id: folderState.entityId,
        project_id: projectId,
        name: folderState.folder.name,
        description: null,
        created_at: now,
        updated_at: now,
      })),
    );

    if (categoryError) {
      throw categoryError;
    }

    if (tableStates.length > 0) {
      const { error: tableError } = await service.from("schema_table").insert(
        tableStates.map((tableState) => ({
          id: tableState.entityId,
          project_id: projectId,
          name: tableState.table.name,
          logical_name: tableState.table.logicalName,
          description: tableState.table.description,
          // Each imported table starts its own version group pointing at itself.
          // Without this the column is left NULL (it has no DB default), which
          // breaks $listTableVersions later — a created version's group query
          // (.eq version_group_id) would never match this original row.
          version: 1,
          version_selected: true,
          version_group_id: tableState.entityId,
          created_at: now,
          updated_at: now,
        })),
      );

      if (tableError) {
        throw tableError;
      }
    }

    if (fieldStates.length > 0) {
      const { error: columnError } = await service.from("schema_column").insert(
        fieldStates.map((fieldState) => ({
          id: fieldState.entityId,
          project_id: projectId,
          table_id: fieldState.tableEntityId,
          name: fieldState.field.name,
          logical_name: fieldState.field.logicalName,
          data_type: fieldState.field.dataType,
          length: fieldState.field.length,
          primary_key: fieldState.field.primaryKey,
          not_null: !fieldState.field.nullable,
          auto_increment: fieldState.field.autoIncrement,
          index: fieldState.field.index,
          unique_flag: fieldState.field.uniqueFlag,
          default_value: fieldState.field.defaultValue,
          comment: null,
          description: fieldState.field.description,
          sort_order: fieldState.field.sortOrder,
          created_at: now,
          updated_at: now,
        })),
      );

      if (columnError) {
        throw columnError;
      }
    }

    const treeNodes = [
      ...folderStates.map((folderState) => ({
        id: folderState.nodeId,
        project_id: projectId,
        entity_type: "category" as const,
        entity_id: folderState.entityId,
        parent_id: null as string | null,
        level: 0,
        path_code: folderState.pathCode,
        children_count: folderState.folder.tables.length,
        sort_order: folderState.folder.sortOrder,
        created_at: now,
        updated_at: now,
      })),
      ...tableStates.map((tableState) => ({
        id: tableState.nodeId,
        project_id: projectId,
        entity_type: "table" as const,
        entity_id: tableState.entityId,
        parent_id: tableState.folderNodeId,
        level: 1,
        path_code: tableState.pathCode,
        children_count: tableState.table.fields.length,
        sort_order: tableState.table.sortOrder,
        created_at: now,
        updated_at: now,
      })),
      ...fieldStates.map((fieldState) => ({
        id: fieldState.entityId,
        project_id: projectId,
        entity_type: "column" as const,
        entity_id: fieldState.entityId,
        parent_id: fieldState.tableNodeId,
        level: 2,
        path_code: fieldState.pathCode,
        children_count: 0,
        sort_order: fieldState.field.sortOrder,
        created_at: now,
        updated_at: now,
      })),
    ];

    if (treeNodes.length > 0) {
      const { error: nodeError } = await service.from("tree_node").insert(treeNodes);
      if (nodeError) {
        throw nodeError;
      }
    }

    const { data: project } = await service
      .from("project")
      .select("short_code")
      .eq("id", projectId)
      .single();

    return { projectId, shortCode: project?.short_code ?? projectId };
  });

import type { Tables } from "@repo/db";

import type {
  SchemaField,
  SchemaFieldType,
  SchemaFolder,
  SchemaProject,
  SchemaTable,
} from "#/components/schema-studio/schema-types";

export function toSchemaProject(row: Tables<"project">["Row"], tableCount: number): SchemaProject {
  return {
    id: row.id,
    shortCode: row.short_code ?? row.id,
    teamId: row.team_id,
    name: row.name,
    count: tableCount,
    color: row.color ?? "bg-blue-500",
  };
}

export function toSchemaFolder(
  row: Tables<"category">["Row"],
  tables: SchemaTable[],
): SchemaFolder {
  return {
    id: row.id,
    name: row.name,
    count: tables.length,
    tables,
  };
}

export function toSchemaTable(
  row: Tables<"schema_table">["Row"],
  fields: SchemaField[],
): SchemaTable {
  return {
    id: row.id,
    shortCode: row.short_code ?? row.id,
    name: row.name,
    logicalName: row.logical_name ?? "",
    description: row.description ?? "",
    version: row.version ?? 1,
    versionSelected: row.version_selected ?? true,
    versionGroupId: row.version_group_id,
    refTableId: row.ref_table_id,
    fields,
  };
}

export function toSchemaField(row: Tables<"schema_column">["Row"]): SchemaField {
  return {
    id: row.id,
    name: row.name,
    logicalName: row.logical_name ?? "",
    dataType: (row.data_type as SchemaFieldType) ?? "text",
    length: row.length ?? 0,
    primaryKey: row.primary_key ?? false,
    nullable: !(row.not_null ?? false),
    autoIncrement: row.auto_increment ?? false,
    index: row.index ?? false,
    description: row.description ?? "",
    uniqueFlag: row.unique_flag ?? false,
    defaultValue: row.default_value,
    comment: row.comment,
    fkTableId: row.fk_table_id,
    fkColumnId: row.fk_column_id,
  };
}

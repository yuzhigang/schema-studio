export const schemaFieldTypes = [
  "integer",
  "float",
  "text",
  "boolean",
  "date",
  "time",
  "datetime",
  "enum",
] as const;

export type SchemaFieldType = (typeof schemaFieldTypes)[number];

export const schemaFieldTypeLabels: Record<SchemaFieldType, string> = {
  integer: "整数",
  float: "浮点",
  text: "文本",
  boolean: "真假",
  date: "日期",
  time: "时间",
  datetime: "日期时间",
  enum: "枚举",
};

export type SchemaField = {
  id: string;
  name: string;
  logicalName: string;
  dataType: SchemaFieldType;
  length: number;
  primaryKey: boolean;
  nullable: boolean;
  autoIncrement: boolean;
  index: boolean;
  description: string;
  uniqueFlag?: boolean;
  defaultValue?: string | null;
  comment?: string | null;
  fkTableId?: string | null;
  fkColumnId?: string | null;
};

export type SchemaTable = {
  id: string;
  shortCode: string;
  name: string;
  logicalName: string;
  description: string;
  version: number;
  versionSelected: boolean;
  versionGroupId?: string | null;
  refTableId?: string | null;
  fields: SchemaField[];
};

export type SchemaFolder = {
  id: string;
  name: string;
  count: number;
  tables: SchemaTable[];
};

export type SchemaProject = {
  id: string;
  shortCode: string;
  teamId: string;
  name: string;
  count: number;
  color: string;
};

export type ProjectMemberRole = "admin" | "editor" | "viewer";

export type SchemaProjectMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: ProjectMemberRole;
};

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type SchemaTeam = {
  id: string;
  shortCode: string;
  name: string;
  slug: string | null;
  role: TeamRole;
};

export type TableMetadata = Pick<SchemaTable, "name" | "logicalName" | "description">;

export function findTableById(tableId: string, folders: SchemaFolder[]): SchemaTable | undefined {
  for (const folder of folders) {
    const table = folder.tables.find((item) => item.id === tableId);
    if (table) {
      return table;
    }
  }

  return undefined;
}

export function findTableByShortCode(
  shortCode: string,
  folders: SchemaFolder[],
): SchemaTable | undefined {
  for (const folder of folders) {
    const table = folder.tables.find((item) => item.shortCode === shortCode);
    if (table) {
      return table;
    }
  }

  return undefined;
}

export function findFirstTable(folders: SchemaFolder[]): SchemaTable | undefined {
  for (const folder of folders) {
    if (folder.tables.length > 0) {
      return folder.tables[0];
    }
  }

  return undefined;
}

export function getTablePath(tableId: string, folders: SchemaFolder[], projectName: string) {
  const table = findTableById(tableId, folders);
  if (!table) {
    return {
      projectName,
      folderName: "",
      table: {
        id: "",
        shortCode: "",
        name: "",
        logicalName: "",
        description: "",
        version: 1,
        versionSelected: true,
        fields: [],
      },
    };
  }

  const folder = folders.find((item) => item.tables.some((tableItem) => tableItem.id === table.id));

  return {
    projectName,
    folderName: folder?.name ?? "",
    table,
  };
}

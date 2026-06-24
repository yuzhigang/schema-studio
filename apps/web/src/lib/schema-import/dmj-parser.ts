import type { SchemaFieldType } from "#/components/schema-studio/schema-types";

import { SchemaParseError, type ParsedSchemaProject, type SchemaParserOptions } from "./types";

type DmjItemList<T> = {
  Count?: number;
  items?: T | T[];
};

type DmjField = {
  ID?: number;
  Name?: string;
  DisplayName?: string;
  Memo?: string;
  OrderNo?: number;
  DataType?: number;
  DataLength?: number;
  DataScale?: number;
  KeyFieldType?: number;
  IndexType?: number;
  Not_Nullable?: boolean;
  AutoIncrement?: boolean;
};

type DmjTable = {
  ID?: number;
  Name?: string;
  Caption?: string;
  Memo?: string;
  OrderNo?: number;
  MetaFields?: DmjItemList<DmjField>;
};

type DmjFolder = {
  ID?: number;
  Name?: string;
  OrderNo?: number;
  Tables?: DmjItemList<DmjTable>;
};

type DmjRoot = {
  RootName?: string;
  TableCount?: number;
  LastModel?: string;
  ModifyDate?: string;
  Count?: number;
  items?: DmjFolder | DmjFolder[];
};

const DEFAULT_TYPE_MAP: Record<number, SchemaFieldType> = {
  1: "text",
  2: "integer",
  3: "float",
  4: "datetime",
  5: "boolean",
};

function normalizeArray<T>(raw: T | T[] | undefined | null): T[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  return Array.isArray(raw) ? raw : [raw];
}

function normalizeList<T>(list?: DmjItemList<T>): T[] {
  if (!list) {
    return [];
  }
  const raw = list.items;
  if (raw === undefined || raw === null) {
    return [];
  }
  return Array.isArray(raw) ? raw : [raw];
}

function mapDataType(value: number | undefined, options: SchemaParserOptions): SchemaFieldType {
  if (value === undefined || value === null) {
    return "text";
  }
  const typeMap = { ...DEFAULT_TYPE_MAP, ...options.dmjTypeMap };
  return typeMap[value] ?? "text";
}

function trimString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function parseField(raw: DmjField, options: SchemaParserOptions) {
  const name = trimString(raw.Name) || `Field_${raw.ID ?? 0}`;
  const logicalName = trimString(raw.DisplayName) || name;
  const description = trimString(raw.Memo);
  const dataType = mapDataType(raw.DataType, options);
  const length = typeof raw.DataLength === "number" ? raw.DataLength : 64;
  const primaryKey = raw.KeyFieldType === 1;
  const index = raw.IndexType === 1;
  const nullable = raw.Not_Nullable === true ? false : !primaryKey;
  const autoIncrement = raw.AutoIncrement === true;
  const uniqueFlag = false;
  const defaultValue = null;
  const sortOrder = typeof raw.OrderNo === "number" ? raw.OrderNo : 0;

  return {
    name,
    logicalName,
    description,
    dataType,
    length,
    primaryKey,
    nullable,
    autoIncrement,
    index,
    uniqueFlag,
    defaultValue,
    sortOrder,
  };
}

function parseTable(raw: DmjTable, options: SchemaParserOptions) {
  const name = trimString(raw.Name) || `Table_${raw.ID ?? 0}`;
  const logicalName = trimString(raw.Caption) || name;
  const description = trimString(raw.Memo);
  const sortOrder = typeof raw.OrderNo === "number" ? raw.OrderNo : 0;
  const fields = normalizeList(raw.MetaFields)
    .map((field) => parseField(field, options))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    name,
    logicalName,
    description,
    sortOrder,
    fields,
  };
}

function parseFolder(raw: DmjFolder, options: SchemaParserOptions) {
  const name = trimString(raw.Name) || `Folder_${raw.ID ?? 0}`;
  const sortOrder = typeof raw.OrderNo === "number" ? raw.OrderNo : 0;
  const tables = normalizeList(raw.Tables)
    .map((table) => parseTable(table, options))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    name,
    sortOrder,
    tables,
  };
}

export function parseDmj(
  content: string,
  fileName?: string,
  options: SchemaParserOptions = {},
): ParsedSchemaProject {
  let root: DmjRoot;
  try {
    root = JSON.parse(content) as DmjRoot;
  } catch (error) {
    throw new SchemaParseError("无法解析 DMJ 文件，请确认文件为有效的 JSON", error);
  }

  if (!root || typeof root !== "object") {
    throw new SchemaParseError("DMJ 文件内容格式不正确");
  }

  const baseName = fileName
    ? fileName.replace(/\.dmj$/i, "")
    : trimString(root.LastModel) || "导入项目";
  const folders = normalizeArray(root.items)
    .map((folder) => parseFolder(folder, options))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    name: baseName,
    description: fileName ?? null,
    folders,
  };
}

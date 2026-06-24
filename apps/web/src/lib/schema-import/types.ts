import type { SchemaFieldType } from "#/components/schema-studio/schema-types";

export type ParsedSchemaField = {
  name: string;
  logicalName: string;
  description: string;
  dataType: SchemaFieldType;
  length: number;
  primaryKey: boolean;
  nullable: boolean;
  autoIncrement: boolean;
  index: boolean;
  uniqueFlag: boolean;
  defaultValue: string | null;
  sortOrder: number;
};

export type ParsedSchemaTable = {
  name: string;
  logicalName: string;
  description: string;
  sortOrder: number;
  fields: ParsedSchemaField[];
};

export type ParsedSchemaFolder = {
  name: string;
  sortOrder: number;
  tables: ParsedSchemaTable[];
};

export type ParsedSchemaProject = {
  name: string;
  description: string | null;
  folders: ParsedSchemaFolder[];
};

export type SchemaParserOptions = {
  /** Override the default DMJ {@code DataType -> SchemaFieldType} mapping. */
  dmjTypeMap?: Partial<Record<number, SchemaFieldType>>;
};

export interface SchemaFileParser {
  readonly format: string;
  parse(content: string, fileName?: string, options?: SchemaParserOptions): ParsedSchemaProject;
}

export class SchemaParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SchemaParseError";
  }
}

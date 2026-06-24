import { parseDmj } from "./dmj-parser";
import { parseSql } from "./sql-parser";
import { SchemaParseError, type ParsedSchemaProject, type SchemaParserOptions } from "./types";

export * from "./types";
export { parseDmj } from "./dmj-parser";
export { parseSql } from "./sql-parser";

export type ImportFileFormat = "dmj" | "sql";

export function parseSchemaFile(
  format: ImportFileFormat,
  content: string,
  fileName?: string,
  options?: SchemaParserOptions,
): ParsedSchemaProject {
  switch (format) {
    case "dmj":
      return parseDmj(content, fileName, options);
    case "sql":
      return parseSql();
    default:
      throw new SchemaParseError(`不支持的文件格式: ${String(format)}`);
  }
}

export function inferImportFormat(fileName: string): ImportFileFormat {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "dmj") {
    return "dmj";
  }
  if (ext === "sql") {
    return "sql";
  }
  throw new SchemaParseError(`无法识别的文件后缀: ${ext}`);
}

export { SchemaParseError };

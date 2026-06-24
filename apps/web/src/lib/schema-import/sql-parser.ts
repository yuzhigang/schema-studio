import { SchemaParseError, type ParsedSchemaProject } from "./types";

export function parseSql(): ParsedSchemaProject {
  throw new SchemaParseError("SQL 文件解析尚未实现");
}

import type { SchemaField } from "./schema-types";

export type SaveTableVersionField = Pick<
  SchemaField,
  | "name"
  | "logicalName"
  | "dataType"
  | "length"
  | "primaryKey"
  | "nullable"
  | "autoIncrement"
  | "index"
  | "description"
  | "uniqueFlag"
  | "defaultValue"
  | "comment"
  | "fkTableId"
  | "fkColumnId"
>;

export function toSaveTableVersionFields(fields: SchemaField[]): SaveTableVersionField[] {
  return fields.map((field) => ({
    name: field.name,
    logicalName: field.logicalName,
    dataType: field.dataType,
    length: field.length,
    primaryKey: field.primaryKey,
    nullable: field.nullable,
    autoIncrement: field.autoIncrement,
    index: field.index,
    description: field.description,
    uniqueFlag: field.uniqueFlag,
    defaultValue: field.defaultValue,
    comment: field.comment,
    fkTableId: field.fkTableId,
    fkColumnId: field.fkColumnId,
  }));
}

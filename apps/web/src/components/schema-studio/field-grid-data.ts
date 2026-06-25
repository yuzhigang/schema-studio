import type { SchemaField } from "./schema-types";

export function insertFieldAfter(
  fields: SchemaField[],
  field: SchemaField,
  afterFieldId?: string,
): SchemaField[] {
  if (!afterFieldId) {
    return [...fields, field];
  }

  const index = fields.findIndex((item) => item.id === afterFieldId);
  if (index < 0) {
    return [...fields, field];
  }

  return [...fields.slice(0, index + 1), field, ...fields.slice(index + 1)];
}

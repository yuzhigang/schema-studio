import { describe, expect, it } from "vitest";

import { insertFieldAfter } from "./field-grid-data";
import type { SchemaField } from "./schema-types";

describe("field grid data", () => {
  it("inserts a field directly after the requested field", () => {
    const fields = [createField("id"), createField("name"), createField("status")];
    const nextField = createField("created-at");

    const result = insertFieldAfter(fields, nextField, "name");

    expect(result.map((field) => field.id)).toEqual(["id", "name", "created-at", "status"]);
  });

  it("appends the field when the requested field is not found", () => {
    const fields = [createField("id")];
    const nextField = createField("name");

    const result = insertFieldAfter(fields, nextField, "missing");

    expect(result.map((field) => field.id)).toEqual(["id", "name"]);
  });
});

function createField(id: string): SchemaField {
  return {
    id,
    name: id,
    logicalName: id,
    dataType: "text",
    length: 64,
    primaryKey: false,
    nullable: false,
    autoIncrement: false,
    index: false,
    description: "",
  };
}

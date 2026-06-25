import { describe, expect, it } from "vitest";

import type { SchemaField } from "./schema-types";
import { toSaveTableVersionFields } from "./schema-version-data";

describe("schema version data", () => {
  it("keeps the current draft field order and editable attributes", () => {
    const fields: SchemaField[] = [
      createField("name", { nullable: true, defaultValue: "" }),
      createField("id", { primaryKey: true, autoIncrement: true }),
    ];

    const result = toSaveTableVersionFields(fields);

    expect(result.map((field) => field.name)).toEqual(["name", "id"]);
    expect(result[0]).toMatchObject({
      name: "name",
      logicalName: "name",
      dataType: "text",
      length: 64,
      primaryKey: false,
      nullable: true,
      autoIncrement: false,
      index: false,
      defaultValue: "",
      description: "",
    });
    expect(result[1]).toMatchObject({
      name: "id",
      primaryKey: true,
      autoIncrement: true,
    });
  });
});

function createField(id: string, patch: Partial<SchemaField> = {}): SchemaField {
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
    defaultValue: null,
    description: "",
    ...patch,
  };
}

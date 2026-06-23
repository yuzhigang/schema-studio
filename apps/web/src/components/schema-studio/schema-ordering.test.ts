import { describe, expect, it } from "vitest";

import type { SchemaField, SchemaFolder } from "./mock-data";
import { moveFieldInTable, moveFolder, moveTableInFolder } from "./schema-ordering";

const folders: SchemaFolder[] = [
  {
    id: "common",
    name: "Common",
    count: 2,
    tables: [
      {
        id: "event",
        name: "Event",
        logicalName: "Event",
        description: "",
        fields: [createField("id", "ID"), createField("code", "Code"), createField("name", "Name")],
      },
      {
        id: "stage",
        name: "Stage",
        logicalName: "Stage",
        description: "",
        fields: [createField("stage-id", "ID")],
      },
    ],
  },
  {
    id: "material",
    name: "Material",
    count: 1,
    tables: [
      {
        id: "sample",
        name: "Sample",
        logicalName: "Sample",
        description: "",
        fields: [createField("sample-id", "ID")],
      },
    ],
  },
];

describe("schema ordering", () => {
  it("moves folders at the root level", () => {
    const result = moveFolder(folders, "material", "common");

    expect(result.map((folder) => folder.id)).toEqual(["material", "common"]);
  });

  it("moves tables inside one folder", () => {
    const result = moveTableInFolder(folders, "common", "stage", "event");
    const commonFolder = result[0];

    expect(commonFolder.tables.map((table) => table.id)).toEqual(["stage", "event"]);
  });

  it("moves fields inside one table", () => {
    const result = moveFieldInTable(folders, "event", "name", "id");
    const eventTable = result[0].tables[0];

    expect(eventTable.fields.map((field) => field.id)).toEqual(["name", "id", "code"]);
  });

  it("returns the same structure when an item is dropped on itself", () => {
    const result = moveFieldInTable(folders, "event", "code", "code");

    expect(result).toBe(folders);
  });
});

function createField(id: string, logicalName: string): SchemaField {
  return {
    id,
    name: id,
    logicalName,
    dataType: "text",
    length: 64,
    primaryKey: false,
    notNull: false,
    autoIncrement: false,
    updated: true,
    description: "",
  };
}

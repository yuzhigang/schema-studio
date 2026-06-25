import { describe, expect, it } from "vitest";

import { applyFieldDraftsToFolders, removeFieldDrafts } from "./schema-tree-data";
import type { SchemaField, SchemaFolder } from "./schema-types";

const folders: SchemaFolder[] = [
  {
    id: "folder-a",
    name: "Folder A",
    count: 2,
    tables: [
      {
        id: "table-a",
        shortCode: "table-a",
        name: "TableA",
        logicalName: "Table A",
        description: "",
        version: 1,
        versionSelected: true,
        fields: [createField("a-id"), createField("a-name")],
      },
      {
        id: "table-b",
        shortCode: "table-b",
        name: "TableB",
        logicalName: "Table B",
        description: "",
        version: 1,
        versionSelected: true,
        fields: [createField("b-id")],
      },
    ],
  },
];

describe("schema tree data", () => {
  it("uses local field drafts for the matching table only", () => {
    const draftFields = [createField("a-name"), createField("a-id"), createField("a-extra")];

    const result = applyFieldDraftsToFolders(folders, {
      "table-a": draftFields,
    });

    expect(result[0]?.tables[0]?.fields.map((field) => field.id)).toEqual([
      "a-name",
      "a-id",
      "a-extra",
    ]);
    expect(result[0]?.tables[1]).toBe(folders[0]?.tables[1]);
  });

  it("removes stale field drafts so refreshed server fields are visible", () => {
    const refreshedFolders: SchemaFolder[] = [
      {
        ...folders[0],
        tables: [
          {
            ...folders[0]!.tables[0]!,
            fields: [createField("a-id")],
          },
        ],
      },
    ];

    const drafts = removeFieldDrafts(
      {
        "table-a": [createField("a-id"), createField("a-name")],
      },
      "table-a",
    );

    const result = applyFieldDraftsToFolders(refreshedFolders, drafts);

    expect(result[0]?.tables[0]?.fields.map((field) => field.id)).toEqual(["a-id"]);
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

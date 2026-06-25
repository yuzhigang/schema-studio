import type { SchemaField, SchemaFolder } from "./schema-types";

export function applyFieldDraftsToFolders(
  folders: SchemaFolder[],
  fieldDrafts: Record<string, SchemaField[]>,
): SchemaFolder[] {
  if (Object.keys(fieldDrafts).length === 0) {
    return folders;
  }

  let changed = false;
  const nextFolders = folders.map((folder) => {
    let folderChanged = false;
    const tables = folder.tables.map((table) => {
      const fields = fieldDrafts[table.id];
      if (!fields) {
        return table;
      }

      folderChanged = true;
      return { ...table, fields };
    });

    if (!folderChanged) {
      return folder;
    }

    changed = true;
    return { ...folder, tables };
  });

  return changed ? nextFolders : folders;
}

export function removeFieldDrafts(
  fieldDrafts: Record<string, SchemaField[]>,
  tableId?: string,
): Record<string, SchemaField[]> {
  if (!tableId) {
    return {};
  }

  if (!(tableId in fieldDrafts)) {
    return fieldDrafts;
  }

  const next = { ...fieldDrafts };
  delete next[tableId];
  return next;
}

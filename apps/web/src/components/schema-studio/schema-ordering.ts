import type { SchemaField, SchemaFolder, SchemaTable } from "./mock-data";

export function moveFolder(folders: SchemaFolder[], activeId: string, overId: string) {
  return reorderById(folders, activeId, overId);
}

export function moveTableInFolder(
  folders: SchemaFolder[],
  folderId: string,
  activeId: string,
  overId: string,
) {
  if (activeId === overId) {
    return folders;
  }

  return folders.map((folder) => {
    if (folder.id !== folderId) {
      return folder;
    }

    return {
      ...folder,
      tables: reorderById(folder.tables, activeId, overId),
    };
  });
}

export function moveFieldInTable(
  folders: SchemaFolder[],
  tableId: string,
  activeId: string,
  overId: string,
) {
  if (activeId === overId) {
    return folders;
  }

  return folders.map((folder) => ({
    ...folder,
    tables: folder.tables.map((table) => {
      if (table.id !== tableId) {
        return table;
      }

      return {
        ...table,
        fields: reorderById(table.fields, activeId, overId),
      };
    }),
  }));
}

export function moveTableToFolder(
  folders: SchemaFolder[],
  tableId: string,
  targetFolderId: string,
) {
  const sourceFolder = folders.find((folder) =>
    folder.tables.some((table) => table.id === tableId),
  );

  if (!sourceFolder || sourceFolder.id === targetFolderId) {
    return folders;
  }

  const table = sourceFolder.tables.find((item) => item.id === tableId);
  if (!table) {
    return folders;
  }

  return folders.map((folder) => {
    if (folder.id === sourceFolder.id) {
      return {
        ...folder,
        tables: folder.tables.filter((item) => item.id !== tableId),
      };
    }

    if (folder.id === targetFolderId) {
      return {
        ...folder,
        tables: [...folder.tables, table],
      };
    }

    return folder;
  });
}

export function moveFieldToTable(
  folders: SchemaFolder[],
  fieldId: string,
  sourceTableId: string,
  targetTableId: string,
) {
  if (sourceTableId === targetTableId) {
    return folders;
  }

  let field: SchemaField | undefined;

  const nextFolders = folders.map((folder) => ({
    ...folder,
    tables: folder.tables.map((table) => {
      if (table.id === sourceTableId) {
        field = table.fields.find((item) => item.id === fieldId);
        return {
          ...table,
          fields: table.fields.filter((item) => item.id !== fieldId),
        };
      }

      if (table.id === targetTableId) {
        return {
          ...table,
          fields: field ? [...table.fields, field] : table.fields,
        };
      }

      return table;
    }),
  }));

  return nextFolders;
}

export function addTableToFolder(folders: SchemaFolder[], folderId: string, table: SchemaTable) {
  return folders.map((folder) => {
    if (folder.id !== folderId) {
      return folder;
    }

    return {
      ...folder,
      count: folder.count + 1,
      tables: [...folder.tables, table],
    };
  });
}

export function deleteFolder(folders: SchemaFolder[], folderId: string) {
  return folders.filter((folder) => folder.id !== folderId);
}

export function addFieldToTable(folders: SchemaFolder[], tableId: string, field: SchemaField) {
  return folders.map((folder) => ({
    ...folder,
    tables: folder.tables.map((table) => {
      if (table.id !== tableId) {
        return table;
      }

      return {
        ...table,
        fields: [...table.fields, field],
      };
    }),
  }));
}

export function deleteTable(folders: SchemaFolder[], tableId: string) {
  return folders.map((folder) => {
    const hasTable = folder.tables.some((table) => table.id === tableId);
    if (!hasTable) {
      return folder;
    }

    return {
      ...folder,
      count: Math.max(0, folder.count - 1),
      tables: folder.tables.filter((table) => table.id !== tableId),
    };
  });
}

export function deleteField(folders: SchemaFolder[], tableId: string, fieldId: string) {
  return folders.map((folder) => ({
    ...folder,
    tables: folder.tables.map((table) => {
      if (table.id !== tableId) {
        return table;
      }

      return {
        ...table,
        fields: table.fields.filter((field) => field.id !== fieldId),
      };
    }),
  }));
}

export function findFolderByTableId(
  folders: SchemaFolder[],
  tableId: string,
): SchemaFolder | undefined {
  return folders.find((folder) => folder.tables.some((table) => table.id === tableId));
}

export function findTableByFieldId(
  folders: SchemaFolder[],
  fieldId: string,
): SchemaTable | undefined {
  for (const folder of folders) {
    for (const table of folder.tables) {
      if (table.fields.some((field) => field.id === fieldId)) {
        return table;
      }
    }
  }

  return undefined;
}

function reorderById<TItem extends { id: string }>(
  items: TItem[],
  activeId: string,
  overId: string,
) {
  if (activeId === overId) {
    return items;
  }

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (activeIndex < 0 || overIndex < 0) {
    return items;
  }

  const nextItems = [...items];
  const [activeItem] = nextItems.splice(activeIndex, 1);
  nextItems.splice(overIndex, 0, activeItem);
  return nextItems;
}

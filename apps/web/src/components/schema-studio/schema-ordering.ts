import type { SchemaFolder } from "./mock-data";

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

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  FolderIcon,
  GripVerticalIcon,
  KeyRoundIcon,
  PlusIcon,
  SearchIcon,
  Table2Icon,
  TypeIcon,
} from "lucide-react";
import { useState } from "react";

import type { SchemaField, SchemaFolder, SchemaTable } from "./mock-data";

type SchemaTreeProps = {
  folders: SchemaFolder[];
  activeTableId: string;
  selectedFieldTableId: string | null;
  selectedFieldId: string | null;
  onFolderMove: (activeId: string, overId: string) => void;
  onTableMove: (folderId: string, activeId: string, overId: string) => void;
  onFieldMove: (tableId: string, activeId: string, overId: string) => void;
  onTableChange: (tableId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
};

type SortableSchemaItem =
  | {
      type: "folder";
      folderId: string;
    }
  | {
      type: "table";
      folderId: string;
      tableId: string;
    }
  | {
      type: "field";
      tableId: string;
      fieldId: string;
    };

export function SchemaTree({
  folders,
  activeTableId,
  selectedFieldTableId,
  selectedFieldId,
  onFolderMove,
  onTableMove,
  onFieldMove,
  onTableChange,
  onFieldChange,
}: SchemaTreeProps) {
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState(
    () => new Set(["common", "gantt", "material-analysis", "directory"]),
  );
  const [openTables, setOpenTables] = useState(() => new Set([activeTableId]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function toggleFolder(folderId: string) {
    setOpenFolders((current) => toggleSetValue(current, folderId));
  }

  function toggleTable(tableId: string) {
    setOpenTables((current) => toggleSetValue(current, tableId));
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) {
      return;
    }

    const activeItem = parseSortableId(event.active.id);
    const overItem = parseSortableId(event.over.id);

    if (!activeItem || !overItem || activeItem.type !== overItem.type) {
      return;
    }

    if (activeItem.type === "folder" && overItem.type === "folder") {
      onFolderMove(activeItem.folderId, overItem.folderId);
      return;
    }

    if (
      activeItem.type === "table" &&
      overItem.type === "table" &&
      activeItem.folderId === overItem.folderId
    ) {
      onTableMove(activeItem.folderId, activeItem.tableId, overItem.tableId);
      return;
    }

    if (
      activeItem.type === "field" &&
      overItem.type === "field" &&
      activeItem.tableId === overItem.tableId
    ) {
      onFieldMove(activeItem.tableId, activeItem.fieldId, overItem.fieldId);
    }
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white">
      <div className="flex h-[58px] items-center gap-2 px-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-9 rounded-md border-slate-200 bg-white pl-9 shadow-none"
          />
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="rounded-md text-slate-700"
          aria-label="新增对象"
        >
          <PlusIcon className="size-5" />
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={folders.map((folder) => getFolderSortableId(folder.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-5 text-sm">
            {folders.map((folder) => (
              <SortableFolderItem
                key={folder.id}
                folder={folder}
                open={openFolders.has(folder.id)}
                activeTableId={activeTableId}
                selectedFieldTableId={selectedFieldTableId}
                selectedFieldId={selectedFieldId}
                openTables={openTables}
                onToggleFolder={toggleFolder}
                onToggleTable={toggleTable}
                onTableChange={onTableChange}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

function SortableFolderItem({
  folder,
  open,
  activeTableId,
  selectedFieldTableId,
  selectedFieldId,
  openTables,
  onToggleFolder,
  onToggleTable,
  onTableChange,
  onFieldChange,
}: {
  folder: SchemaFolder;
  open: boolean;
  activeTableId: string;
  selectedFieldTableId: string | null;
  selectedFieldId: string | null;
  openTables: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onToggleTable: (tableId: string) => void;
  onTableChange: (tableId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getFolderSortableId(folder.id),
  });
  const style = getSortableStyle(transform, transition);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md",
          isDragging && "bg-blue-50 opacity-70",
        )}
      >
        <DragHandle attributes={attributes} listeners={listeners} label="拖拽分组排序" />
        <button
          type="button"
          onClick={() => onToggleFolder(folder.id)}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
          aria-label={open ? "收起目录" : "展开目录"}
        >
          {open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </button>
        <FolderIcon className="size-4 text-orange-500" />
        <span className="font-medium text-slate-900">
          {folder.name} ({folder.count})
        </span>
        <div className="ml-auto flex items-center gap-1">
          <CircleMinusIcon className="size-4 text-slate-500" />
          <CirclePlusIcon className="size-4 text-slate-500" />
        </div>
      </div>
      {open && (
        <SortableContext
          items={folder.tables.map((table) => getTableSortableId(folder.id, table.id))}
          strategy={verticalListSortingStrategy}
        >
          {folder.tables.map((table) => (
            <SortableTableItem
              key={table.id}
              folderId={folder.id}
              table={table}
              open={openTables.has(table.id)}
              active={activeTableId === table.id}
              selectedFieldTableId={selectedFieldTableId}
              selectedFieldId={selectedFieldId}
              onToggleTable={onToggleTable}
              onTableChange={onTableChange}
              onFieldChange={onFieldChange}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

function SortableTableItem({
  folderId,
  table,
  open,
  active,
  selectedFieldTableId,
  selectedFieldId,
  onToggleTable,
  onTableChange,
  onFieldChange,
}: {
  folderId: string;
  table: SchemaTable;
  open: boolean;
  active: boolean;
  selectedFieldTableId: string | null;
  selectedFieldId: string | null;
  onToggleTable: (tableId: string) => void;
  onTableChange: (tableId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getTableSortableId(folderId, table.id),
  });
  const style = getSortableStyle(transform, transition);

  return (
    <div ref={setNodeRef} className="ml-5" style={style}>
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md pr-2",
          active && "bg-blue-50 text-blue-700",
          isDragging && "bg-blue-50 opacity-70",
        )}
      >
        <DragHandle attributes={attributes} listeners={listeners} label="拖拽表排序" />
        <button
          type="button"
          onClick={() => onToggleTable(table.id)}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
          aria-label={open ? "收起表" : "展开表"}
        >
          {open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => onTableChange(table.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <Table2Icon className="size-4 shrink-0 text-blue-500" />
          <span className="truncate">
            {table.name}({table.logicalName})
          </span>
        </button>
        <CircleMinusIcon className="size-4 shrink-0 text-slate-500" />
        <CirclePlusIcon className="size-4 shrink-0 text-slate-500" />
      </div>
      {open && (
        <SortableContext
          items={table.fields.map((field) => getFieldSortableId(table.id, field.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="ml-7 border-l border-slate-200 pl-3">
            {table.fields.map((field) => (
              <SortableFieldItem
                key={field.id}
                tableId={table.id}
                field={field}
                selected={selectedFieldTableId === table.id && selectedFieldId === field.id}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function SortableFieldItem({
  tableId,
  field,
  selected,
  onFieldChange,
}: {
  tableId: string;
  field: SchemaField;
  selected: boolean;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getFieldSortableId(tableId, field.id),
  });
  const style = getSortableStyle(transform, transition);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-8 items-center gap-1 rounded-md pr-2 text-slate-700",
        selected && "bg-blue-50 text-blue-700",
        isDragging && "bg-blue-50 opacity-70",
      )}
    >
      <DragHandle attributes={attributes} listeners={listeners} label="拖拽字段排序" />
      <button
        type="button"
        onClick={() => onFieldChange(tableId, field.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {field.primaryKey ? (
          <KeyRoundIcon className="size-4 shrink-0 text-orange-500" />
        ) : field.dataType === "boolean" ? (
          <span className="flex size-4 shrink-0 items-center justify-center rounded border border-emerald-500 text-emerald-600">
            <span className="size-2 rounded-sm bg-emerald-500" />
          </span>
        ) : (
          <TypeIcon className="size-4 shrink-0 text-slate-500" />
        )}
        <span className="truncate">
          {field.name}({field.logicalName})
        </span>
      </button>
    </div>
  );
}

function DragHandle({
  attributes,
  listeners,
  label,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  label: string;
}) {
  return (
    <button
      type="button"
      className="cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}

function getSortableStyle(
  transform: ReturnType<typeof useSortable>["transform"],
  transition: string | undefined,
) {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
  };
}

function getFolderSortableId(folderId: string) {
  return `folder:${folderId}`;
}

function getTableSortableId(folderId: string, tableId: string) {
  return `table:${folderId}:${tableId}`;
}

function getFieldSortableId(tableId: string, fieldId: string) {
  return `field:${tableId}:${fieldId}`;
}

function parseSortableId(id: UniqueIdentifier): SortableSchemaItem | null {
  const value = String(id);
  const parts = value.split(":");

  if (parts[0] === "folder" && parts[1]) {
    return { type: "folder", folderId: parts[1] };
  }

  if (parts[0] === "table" && parts[1] && parts[2]) {
    return { type: "table", folderId: parts[1], tableId: parts[2] };
  }

  if (parts[0] === "field" && parts[1] && parts[2]) {
    return { type: "field", tableId: parts[1], fieldId: parts[2] };
  }

  return null;
}

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

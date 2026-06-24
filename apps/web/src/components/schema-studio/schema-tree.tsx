import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
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
import { useMemo, useRef, useState } from "react";

import type { SchemaField, SchemaFolder, SchemaTable } from "./schema-types";
import { findTableByShortCode } from "./schema-types";

type SelectedNode =
  | { type: "folder"; id: string }
  | { type: "table"; id: string }
  | { type: "field"; tableId: string; fieldId: string }
  | null;

type SchemaTreeProps = {
  folders: SchemaFolder[];
  selectedNode: SelectedNode;
  activeTableShortCode?: string;
  onFolderMove: (activeId: string, overId: string) => void;
  onTableMove: (folderId: string, activeId: string, overId: string) => void;
  onFieldMove: (tableId: string, activeId: string, overId: string) => void;
  onTableMoveToFolder: (tableId: string, folderId: string) => void;
  onFieldMoveToTable: (fieldId: string, sourceTableId: string, targetTableId: string) => void;
  onAddTable: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddField: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onFolderChange: (folderId: string) => void;
  onTableChange: (tableShortCode: string) => void;
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

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions && pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  return rectIntersection(args);
};

export function SchemaTree({
  folders,
  selectedNode,
  activeTableShortCode,
  onFolderMove,
  onTableMove,
  onFieldMove,
  onTableMoveToFolder,
  onFieldMoveToTable,
  onAddTable,
  onDeleteFolder,
  onAddField,
  onDeleteTable,
  onDeleteField,
  onFolderChange,
  onTableChange,
  onFieldChange,
}: SchemaTreeProps) {
  const activeTableId = useMemo(
    () =>
      activeTableShortCode ? (findTableByShortCode(activeTableShortCode, folders)?.id ?? "") : "",
    [activeTableShortCode, folders],
  );
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState(
    () => new Set(["common", "gantt", "material-analysis", "directory"]),
  );
  const [openTables, setOpenTables] = useState(() => new Set(activeTableId ? [activeTableId] : []));
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [hoveredId, setHoveredId] = useState<UniqueIdentifier | null>(null);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = useMemo(() => {
    if (!activeId) {
      return null;
    }
    return parseSortableId(activeId);
  }, [activeId]);

  const activeFolder = useMemo(() => {
    if (activeItem?.type !== "folder") {
      return undefined;
    }
    return folders.find((folder) => folder.id === activeItem.folderId);
  }, [activeItem, folders]);

  const activeTable = useMemo(() => {
    if (activeItem?.type !== "table") {
      return undefined;
    }
    return folders
      .find((folder) => folder.id === activeItem.folderId)
      ?.tables.find((table) => table.id === activeItem.tableId);
  }, [activeItem, folders]);

  const activeField = useMemo(() => {
    if (activeItem?.type !== "field") {
      return undefined;
    }
    return folders
      .flatMap((folder) => folder.tables)
      .find((table) => table.id === activeItem.tableId)
      ?.fields.find((field) => field.id === activeItem.fieldId);
  }, [activeItem, folders]);

  function toggleFolder(folderId: string) {
    setOpenFolders((current) => toggleSetValue(current, folderId));
  }

  function toggleTable(tableId: string) {
    setOpenTables((current) => toggleSetValue(current, tableId));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleContainerMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const row = target.closest("[data-hover-id]") as HTMLElement | null;
    const nextId = row?.dataset.hoverId ?? null;
    setHoveredId(nextId);
  }

  function handleContainerMouseLeave() {
    setHoveredId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    if (!event.over) {
      return;
    }

    const activeItem = parseSortableId(event.active.id);
    const overItem = parseSortableId(event.over.id);

    if (!activeItem || !overItem) {
      return;
    }

    if (activeItem.type === "folder" && overItem.type === "folder") {
      onFolderMove(activeItem.folderId, overItem.folderId);
      return;
    }

    if (activeItem.type === "table") {
      if (overItem.type === "folder") {
        onTableMoveToFolder(activeItem.tableId, overItem.folderId);
        setOpenFolders((current) => addToSet(current, overItem.folderId));
        return;
      }

      if (overItem.type === "table" && activeItem.folderId === overItem.folderId) {
        onTableMove(activeItem.folderId, activeItem.tableId, overItem.tableId);
        return;
      }

      if (overItem.type === "table" && activeItem.folderId !== overItem.folderId) {
        onTableMoveToFolder(activeItem.tableId, overItem.folderId);
        onTableMove(overItem.folderId, activeItem.tableId, overItem.tableId);
        setOpenFolders((current) => addToSet(current, overItem.folderId));
      }

      return;
    }

    if (activeItem.type === "field") {
      if (overItem.type === "table") {
        onFieldMoveToTable(activeItem.fieldId, activeItem.tableId, overItem.tableId);
        setOpenTables((current) => addToSet(current, overItem.tableId));
        return;
      }

      if (overItem.type === "field" && activeItem.tableId === overItem.tableId) {
        onFieldMove(activeItem.tableId, activeItem.fieldId, overItem.fieldId);
        return;
      }

      if (overItem.type === "field" && activeItem.tableId !== overItem.tableId) {
        onFieldMoveToTable(activeItem.fieldId, activeItem.tableId, overItem.tableId);
        onFieldMove(overItem.tableId, activeItem.fieldId, overItem.fieldId);
        setOpenTables((current) => addToSet(current, overItem.tableId));
      }
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
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={folders.map((folder) => getFolderSortableId(folder.id))}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={treeContainerRef}
            className="min-h-0 flex-1 overflow-auto px-3 pb-5 text-sm"
            onMouseMove={handleContainerMouseMove}
            onMouseLeave={handleContainerMouseLeave}
          >
            {folders.map((folder) => (
              <SortableFolderItem
                key={folder.id}
                folder={folder}
                open={openFolders.has(folder.id)}
                selected={selectedNode?.type === "folder" && selectedNode.id === folder.id}
                selectedNode={selectedNode}
                activeTableId={activeTableId}
                openTables={openTables}
                activeId={activeId}
                hoveredId={hoveredId}
                onToggleFolder={toggleFolder}
                onToggleTable={toggleTable}
                onAddTable={onAddTable}
                onDeleteFolder={onDeleteFolder}
                onAddField={onAddField}
                onDeleteTable={onDeleteTable}
                onDeleteField={onDeleteField}
                onFolderChange={onFolderChange}
                onTableChange={onTableChange}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
        >
          {activeItem?.type === "folder" && activeFolder ? (
            <FolderOverlay folder={activeFolder} />
          ) : activeItem?.type === "table" && activeTable ? (
            <TableOverlay table={activeTable} />
          ) : activeItem?.type === "field" && activeField ? (
            <FieldOverlay field={activeField} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </aside>
  );
}

function SortableFolderItem({
  folder,
  open,
  selected,
  selectedNode,
  activeTableId,
  openTables,
  activeId,
  hoveredId,
  onToggleFolder,
  onToggleTable,
  onAddTable,
  onDeleteFolder,
  onAddField,
  onDeleteTable,
  onDeleteField,
  onFolderChange,
  onTableChange,
  onFieldChange,
}: {
  folder: SchemaFolder;
  open: boolean;
  selected: boolean;
  selectedNode: SelectedNode;
  activeTableId: string;
  openTables: Set<string>;
  activeId: UniqueIdentifier | null;
  hoveredId: UniqueIdentifier | null;
  onToggleFolder: (folderId: string) => void;
  onToggleTable: (tableId: string) => void;
  onAddTable: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddField: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onFolderChange: (folderId: string) => void;
  onTableChange: (tableId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getFolderSortableId(folder.id),
    data: { type: "folder", folderId: folder.id },
  });
  const style = getSortableStyle(transform, transition);
  const isDropTarget = isOverItem(activeId, { type: "folder", folderId: folder.id });

  const folderSortableId = getFolderSortableId(folder.id);
  const isHovered = hoveredId === folderSortableId;

  return (
    <div ref={setNodeRef} data-hover-id={folderSortableId} style={style}>
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-transparent px-1 transition-colors",
          selected && !isDragging && "bg-blue-50 text-blue-700",
          isDragging && "bg-blue-50 opacity-40",
          isDropTarget && "border-blue-300 bg-blue-50",
        )}
      >
        <DragHandle
          attributes={attributes}
          listeners={listeners}
          label="拖拽分组排序"
          isHovered={isHovered}
        />
        <button
          type="button"
          onClick={() => onToggleFolder(folder.id)}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
          aria-label={open ? "收起目录" : "展开目录"}
        >
          {open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => onFolderChange(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <FolderIcon className="size-4 text-orange-500" />
          <span className="font-medium text-slate-900">
            {folder.name} ({folder.count})
          </span>
        </button>
        <div
          className={cn(
            "ml-auto flex items-center gap-1 opacity-0 transition-opacity",
            isHovered && "opacity-100",
          )}
        >
          <button
            type="button"
            onClick={() => onDeleteFolder(folder.id)}
            className="rounded p-0.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="删除分组"
          >
            <CircleMinusIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onAddTable(folder.id)}
            className="rounded p-0.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            aria-label="在该分组下新增表"
          >
            <CirclePlusIcon className="size-4" />
          </button>
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
              selected={selectedNode?.type === "table" && selectedNode.id === table.id}
              selectedNode={selectedNode}
              activeTableId={activeTableId}
              activeId={activeId}
              hoveredId={hoveredId}
              onToggleTable={onToggleTable}
              onAddField={onAddField}
              onDeleteTable={onDeleteTable}
              onDeleteField={onDeleteField}
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
  selected,
  selectedNode,
  activeTableId: _activeTableId,
  activeId,
  hoveredId,
  onToggleTable,
  onAddField,
  onDeleteTable,
  onDeleteField,
  onTableChange,
  onFieldChange,
}: {
  folderId: string;
  table: SchemaTable;
  open: boolean;
  selected: boolean;
  selectedNode: SelectedNode;
  activeTableId: string;
  activeId: UniqueIdentifier | null;
  hoveredId: UniqueIdentifier | null;
  onToggleTable: (tableId: string) => void;
  onAddField: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onTableChange: (tableId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getTableSortableId(folderId, table.id),
    data: { type: "table", folderId, tableId: table.id },
  });
  const style = getSortableStyle(transform, transition);
  const isDropTarget = isOverItem(activeId, { type: "table", folderId, tableId: table.id });

  const tableSortableId = getTableSortableId(folderId, table.id);
  const isHovered = hoveredId === tableSortableId;

  return (
    <div ref={setNodeRef} data-hover-id={tableSortableId} className="ml-5" style={style}>
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-transparent px-1 pr-2 transition-colors",
          selected && !isDragging && "bg-blue-50 text-blue-700",
          isDragging && "bg-blue-50 opacity-40",
          isDropTarget && "border-blue-300 bg-blue-50",
        )}
      >
        <DragHandle
          attributes={attributes}
          listeners={listeners}
          label="拖拽表排序"
          isHovered={isHovered}
        />
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
          onClick={() => onTableChange(table.shortCode)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <Table2Icon className="size-4 shrink-0 text-blue-500" />
          <span className="truncate">
            {table.name}({table.logicalName})
          </span>
        </button>
        <div
          className={cn(
            "ml-auto flex items-center gap-1 opacity-0 transition-opacity",
            isHovered && "opacity-100",
          )}
        >
          <button
            type="button"
            onClick={() => onDeleteTable(table.id)}
            className="rounded p-0.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="删除表"
          >
            <CircleMinusIcon className="size-4 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => onAddField(table.id)}
            className="rounded p-0.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            aria-label="在该表下新增字段"
          >
            <CirclePlusIcon className="size-4 shrink-0" />
          </button>
        </div>
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
                selected={selectedNode?.type === "field" && selectedNode.fieldId === field.id}
                activeId={activeId}
                hoveredId={hoveredId}
                onDeleteField={onDeleteField}
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
  activeId,
  hoveredId,
  onDeleteField,
  onFieldChange,
}: {
  tableId: string;
  field: SchemaField;
  selected: boolean;
  activeId: UniqueIdentifier | null;
  hoveredId: UniqueIdentifier | null;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getFieldSortableId(tableId, field.id),
    data: { type: "field", tableId, fieldId: field.id },
  });
  const style = getSortableStyle(transform, transition);
  const isDropTarget = isOverItem(activeId, { type: "field", tableId, fieldId: field.id });

  const fieldSortableId = getFieldSortableId(tableId, field.id);
  const isHovered = hoveredId === fieldSortableId;

  return (
    <div
      ref={setNodeRef}
      data-hover-id={fieldSortableId}
      style={style}
      className={cn(
        "flex h-8 items-center gap-1 rounded-md border border-transparent px-1 pr-2 text-slate-700 transition-colors",
        selected && !isDragging && "bg-blue-50 text-blue-700",
        isDragging && "bg-blue-50 opacity-40",
        isDropTarget && "border-blue-300 bg-blue-50",
      )}
    >
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        label="拖拽字段排序"
        isHovered={isHovered}
      />
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
      <button
        type="button"
        onClick={() => onDeleteField(tableId, field.id)}
        className={cn(
          "rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600",
          isHovered && "opacity-100",
        )}
        aria-label="删除字段"
      >
        <CircleMinusIcon className="size-4 shrink-0" />
      </button>
    </div>
  );
}

function DragHandle({
  attributes,
  listeners,
  label,
  isHovered,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  label: string;
  isHovered: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-grab rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 focus-visible:opacity-100 active:cursor-grabbing",
        isHovered && "opacity-100",
      )}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}

function FolderOverlay({ folder }: { folder: SchemaFolder }) {
  return (
    <div className="flex h-8 w-[280px] items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 shadow-lg">
      <FolderIcon className="size-4 text-orange-500" />
      <span className="font-medium text-slate-900">
        {folder.name} ({folder.count})
      </span>
    </div>
  );
}

function TableOverlay({ table }: { table: SchemaTable }) {
  return (
    <div className="flex h-8 w-[260px] items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 shadow-lg">
      <Table2Icon className="size-4 shrink-0 text-blue-500" />
      <span className="truncate text-slate-900">
        {table.name}({table.logicalName})
      </span>
    </div>
  );
}

function FieldOverlay({ field }: { field: SchemaField }) {
  return (
    <div className="flex h-8 w-[240px] items-center gap-2 rounded-md border border-blue-200 bg-white px-3 text-slate-700 shadow-lg">
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
    </div>
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

function isOverItem(activeId: UniqueIdentifier | null, item: SortableSchemaItem): boolean {
  if (!activeId) {
    return false;
  }

  const activeItem = parseSortableId(activeId);
  if (!activeItem) {
    return false;
  }

  if (activeItem.type !== item.type) {
    return false;
  }

  if (activeItem.type === "folder" && item.type === "folder") {
    return activeItem.folderId === item.folderId;
  }

  if (activeItem.type === "table" && item.type === "table") {
    return activeItem.tableId === item.tableId;
  }

  if (activeItem.type === "field" && item.type === "field") {
    return activeItem.fieldId === item.fieldId;
  }

  return false;
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

function addToSet(current: Set<string>, value: string) {
  if (current.has(value)) {
    return current;
  }
  return new Set(current).add(value);
}

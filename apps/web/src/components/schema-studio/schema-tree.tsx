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
  FolderPlusIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  SearchIcon,
  Table2Icon,
  TypeIcon,
  UploadIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { SchemaField, SchemaFolder, SchemaTable } from "./schema-types";
import { findTableByShortCode } from "./schema-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SelectedNode =
  | { type: "folder"; id: string }
  | { type: "table"; id: string }
  | { type: "field"; tableId: string; fieldId: string }
  | null;

type SortableSchemaItem =
  | { type: "folder"; folderId: string }
  | { type: "table"; folderId: string; tableId: string };

type SchemaTreeProps = {
  folders: SchemaFolder[];
  selectedNode: SelectedNode;
  activeTableShortCode?: string;
  onFolderMove: (activeId: string, overId: string) => void;
  onTableMove: (folderId: string, activeId: string, overId: string) => void;
  onTableMoveToFolder: (tableId: string, folderId: string) => void;
  onAddGroup: () => void;
  onImport?: () => void;
  onRefresh: () => void;
  onAddTable: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddField: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onFolderChange: (folderId: string) => void;
  onTableChange: (tableShortCode: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
};

// ---------------------------------------------------------------------------
// Tree interaction context
//
// The folder/table/field rows all need the same callbacks plus shared
// interaction state (selection, expansion, drag/hover, click guard). Threading
// these through every level by hand produced 10-15 props per item; instead the
// shared bundle lives in a context and each row reads only what it needs while
// still receiving its own identity (folder/table/field) by prop.
// ---------------------------------------------------------------------------

type SchemaTreeContextValue = {
  selectedNode: SelectedNode;
  openTables: Set<string>;
  activeId: UniqueIdentifier | null;
  hoveredId: string | null;
  clickGuard: MutableRefObject<boolean>;
  onToggleFolder: (folderId: string) => void;
  onToggleTable: (tableId: string) => void;
  onAddTable: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddField: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteField: (tableId: string, fieldId: string) => void;
  onFolderChange: (folderId: string) => void;
  onTableChange: (tableShortCode: string) => void;
  onFieldChange: (tableId: string, fieldId: string) => void;
};

const SchemaTreeContext = createContext<SchemaTreeContextValue | null>(null);

function useSchemaTree(): SchemaTreeContextValue {
  const value = useContext(SchemaTreeContext);
  if (!value) {
    throw new Error("useSchemaTree must be used within a SchemaTree");
  }
  return value;
}

// ---------------------------------------------------------------------------
// Expansion + search state
// ---------------------------------------------------------------------------

function useTreeExpansion(folders: SchemaFolder[], activeTableId: string) {
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState(() =>
    getInitialOpenFolders(folders, activeTableId),
  );
  const [openTables, setOpenTables] = useState(() => new Set(activeTableId ? [activeTableId] : []));

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const visibleFolders = useMemo(
    () => (isSearching ? filterFolders(folders, trimmedQuery) : folders),
    [folders, isSearching, trimmedQuery],
  );

  // While searching, auto-expand the folders/tables that contain matches so the
  // results are visible, but keep the expansion in real state so the user can
  // still collapse/expand each node by clicking it.
  useEffect(() => {
    if (!isSearching) {
      return;
    }

    const { folderIds, tableIds } = computeAutoOpen(folders, trimmedQuery);
    setOpenFolders((current) => unionSets(current, folderIds));
    setOpenTables((current) => unionSets(current, tableIds));
  }, [isSearching, trimmedQuery, folders]);

  function toggleFolder(folderId: string) {
    setOpenFolders((current) => toggleSetValue(current, folderId));
  }

  function toggleTable(tableId: string) {
    setOpenTables((current) => toggleSetValue(current, tableId));
  }

  function openFolder(folderId: string) {
    setOpenFolders((current) => addToSet(current, folderId));
  }

  return {
    query,
    setQuery,
    openFolders,
    openTables,
    isSearching,
    visibleFolders,
    toggleFolder,
    toggleTable,
    openFolder,
  };
}

// ---------------------------------------------------------------------------
// Drag-and-drop orchestration
// ---------------------------------------------------------------------------

function useSchemaTreeDnd({
  folders,
  onFolderMove,
  onTableMove,
  onTableMoveToFolder,
  openFolder,
}: {
  folders: SchemaFolder[];
  onFolderMove: (activeId: string, overId: string) => void;
  onTableMove: (folderId: string, activeId: string, overId: string) => void;
  onTableMoveToFolder: (tableId: string, folderId: string) => void;
  openFolder: (folderId: string) => void;
}) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // When the whole row is the drag handle, a completed drag still emits a
  // trailing `click` on the inner button. This guard swallows that one click so
  // reordering a node does not also toggle/navigate it.
  const justDraggedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = useMemo(() => (activeId ? parseSortableId(activeId) : null), [activeId]);

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

  function handleDragStart(event: DragStartEvent) {
    justDraggedRef.current = false;
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    // Only treat this as a drag (and suppress the trailing synthetic click) when
    // the pointer actually landed on a different node. A plain click that jitters
    // past the 6px threshold drops onto itself — that must still toggle the row,
    // otherwise expanding a table by clicking it appears to "lose" its fields.
    const isRealMove = Boolean(event.over) && String(event.over?.id) !== String(event.active.id);
    if (isRealMove) {
      justDraggedRef.current = true;
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 250);
    }

    if (!event.over) {
      return;
    }

    const draggedItem = parseSortableId(event.active.id);
    const overItem = parseSortableId(event.over.id);

    if (!draggedItem || !overItem) {
      return;
    }

    if (draggedItem.type === "folder" && overItem.type === "folder") {
      onFolderMove(draggedItem.folderId, overItem.folderId);
      return;
    }

    if (draggedItem.type === "table") {
      if (overItem.type === "folder") {
        onTableMoveToFolder(draggedItem.tableId, overItem.folderId);
        openFolder(overItem.folderId);
        return;
      }

      if (overItem.type === "table" && draggedItem.folderId === overItem.folderId) {
        onTableMove(draggedItem.folderId, draggedItem.tableId, overItem.tableId);
        return;
      }

      if (overItem.type === "table" && draggedItem.folderId !== overItem.folderId) {
        // Cross-folder: move into the target folder only. Reordering within the
        // target in the same gesture would race the move (the table is not yet
        // in the target folder in our cached tree); the user can reorder after.
        onTableMoveToFolder(draggedItem.tableId, overItem.folderId);
        openFolder(overItem.folderId);
      }
    }
  }

  return {
    sensors,
    activeId,
    activeItem,
    activeFolder,
    activeTable,
    justDraggedRef,
    handleDragStart,
    handleDragEnd,
  };
}

// ---------------------------------------------------------------------------
// SchemaTree (orchestrator)
// ---------------------------------------------------------------------------

export function SchemaTree({
  folders,
  selectedNode,
  activeTableShortCode,
  onFolderMove,
  onTableMove,
  onTableMoveToFolder,
  onAddGroup,
  onImport,
  onRefresh,
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

  const {
    query,
    setQuery,
    openFolders,
    openTables,
    isSearching,
    visibleFolders,
    toggleFolder,
    toggleTable,
    openFolder,
  } = useTreeExpansion(folders, activeTableId);

  const {
    sensors,
    activeId,
    activeItem,
    activeFolder,
    activeTable,
    justDraggedRef,
    handleDragStart,
    handleDragEnd,
  } = useSchemaTreeDnd({ folders, onFolderMove, onTableMove, onTableMoveToFolder, openFolder });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  function handleContainerMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const row = target.closest("[data-hover-id]") as HTMLElement | null;
    setHoveredId(row?.dataset.hoverId ?? null);
  }

  function handleContainerMouseLeave() {
    setHoveredId(null);
  }

  const contextValue = useMemo<SchemaTreeContextValue>(
    () => ({
      selectedNode,
      openTables,
      activeId,
      hoveredId,
      clickGuard: justDraggedRef,
      onToggleFolder: toggleFolder,
      onToggleTable: toggleTable,
      onAddTable,
      onDeleteFolder,
      onAddField,
      onDeleteTable,
      onDeleteField,
      onFolderChange,
      onTableChange,
      onFieldChange,
    }),
    // toggleFolder/toggleTable are stable enough for this render scope; the
    // identity-bearing state (selection/expansion/hover/drag) is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedNode,
      openTables,
      activeId,
      hoveredId,
      onAddTable,
      onDeleteFolder,
      onAddField,
      onDeleteTable,
      onDeleteField,
      onFolderChange,
      onTableChange,
      onFieldChange,
    ],
  );

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white">
      <div className="flex h-[58px] items-center justify-between px-3">
        <h2 className="text-sm font-semibold text-slate-900">表格</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="新增分组"
            onClick={onAddGroup}
          >
            <FolderPlusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="导入"
            onClick={() => onImport?.()}
          >
            <UploadIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="刷新"
            onClick={onRefresh}
          >
            <RefreshCwIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 rounded-md border-slate-200 bg-white pl-9 text-sm shadow-none"
          />
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SchemaTreeContext.Provider value={contextValue}>
          <SortableContext
            items={visibleFolders.map((folder) => getFolderSortableId(folder.id))}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={treeContainerRef}
              className="min-h-0 flex-1 overflow-auto px-3 pb-5 text-sm"
              onMouseMove={handleContainerMouseMove}
              onMouseLeave={handleContainerMouseLeave}
            >
              {visibleFolders.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-slate-400">
                  {isSearching ? "未找到匹配的节点" : "暂无分组"}
                </div>
              ) : (
                visibleFolders.map((folder) => (
                  <SortableFolderItem
                    key={folder.id}
                    folder={folder}
                    open={openFolders.has(folder.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </SchemaTreeContext.Provider>

        <DragOverlay
          dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
        >
          {activeItem?.type === "folder" && activeFolder ? (
            <FolderOverlay folder={activeFolder} />
          ) : activeItem?.type === "table" && activeTable ? (
            <TableOverlay table={activeTable} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function SortableFolderItem({ folder, open }: { folder: SchemaFolder; open: boolean }) {
  const {
    selectedNode,
    activeId,
    hoveredId,
    clickGuard,
    onToggleFolder,
    onAddTable,
    onDeleteFolder,
    onFolderChange,
  } = useSchemaTree();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getFolderSortableId(folder.id),
    data: { type: "folder", folderId: folder.id },
  });
  const style = getSortableStyle(transform, transition);
  const isDropTarget = isOverItem(activeId, { type: "folder", folderId: folder.id });
  const selected = selectedNode?.type === "folder" && selectedNode.id === folder.id;

  const folderSortableId = getFolderSortableId(folder.id);
  const isHovered = hoveredId === folderSortableId;

  return (
    <div ref={setNodeRef} data-hover-id={folderSortableId} style={style}>
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex h-8 cursor-grab items-center gap-1.5 rounded-md border border-transparent px-1 transition-colors active:cursor-grabbing",
          selected && !isDragging && "bg-blue-50 text-blue-700",
          isDragging && "bg-blue-50 opacity-40",
          isDropTarget && "border-blue-300 bg-blue-50",
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (clickGuard.current) {
              clickGuard.current = false;
              return;
            }
            onToggleFolder(folder.id);
            onFolderChange(folder.id);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {open ? (
            <ChevronDownIcon className="size-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-slate-500" />
          )}
          <FolderIcon className="size-4 shrink-0 text-orange-500" />
          <span className="truncate font-medium whitespace-nowrap text-slate-900">
            {folder.name} ({folder.count})
          </span>
        </button>
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity",
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
            <SortableTableItem key={table.id} folderId={folder.id} table={table} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

function SortableTableItem({ folderId, table }: { folderId: string; table: SchemaTable }) {
  const {
    selectedNode,
    openTables,
    activeId,
    hoveredId,
    clickGuard,
    onToggleTable,
    onAddField,
    onDeleteTable,
    onTableChange,
  } = useSchemaTree();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getTableSortableId(folderId, table.id),
    data: { type: "table", folderId, tableId: table.id },
  });
  const style = getSortableStyle(transform, transition);
  const isDropTarget = isOverItem(activeId, { type: "table", folderId, tableId: table.id });
  const open = openTables.has(table.id);
  const selected = selectedNode?.type === "table" && selectedNode.id === table.id;

  const tableSortableId = getTableSortableId(folderId, table.id);
  const isHovered = hoveredId === tableSortableId;

  return (
    <div ref={setNodeRef} data-hover-id={tableSortableId} className="ml-5" style={style}>
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex h-8 cursor-grab items-center gap-1.5 rounded-md border border-transparent px-1 pr-2 transition-colors active:cursor-grabbing",
          selected && !isDragging && "bg-blue-50 text-blue-700",
          isDragging && "bg-blue-50 opacity-40",
          isDropTarget && "border-blue-300 bg-blue-50",
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (clickGuard.current) {
              clickGuard.current = false;
              return;
            }
            onToggleTable(table.id);
            onTableChange(table.shortCode);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {open ? (
            <ChevronDownIcon className="size-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-slate-500" />
          )}
          <Table2Icon className="size-4 shrink-0 text-blue-500" />
          <span className="truncate">
            {table.name}({table.logicalName})
          </span>
        </button>
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity",
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
        <div className="ml-7 border-l border-slate-200 pl-3">
          {table.fields.map((field) => (
            <FieldItem key={field.id} tableId={table.id} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldItem({ tableId, field }: { tableId: string; field: SchemaField }) {
  const { selectedNode, hoveredId, onDeleteField, onFieldChange } = useSchemaTree();

  const fieldHoverId = getFieldHoverId(tableId, field.id);
  const isHovered = hoveredId === fieldHoverId;
  const selected = selectedNode?.type === "field" && selectedNode.fieldId === field.id;

  return (
    <div
      data-hover-id={fieldHoverId}
      className={cn(
        "flex h-8 items-center gap-1 rounded-md border border-transparent px-1 pr-2 text-slate-700 transition-colors",
        selected && "bg-blue-50 text-blue-700",
      )}
    >
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

// ---------------------------------------------------------------------------
// Drag overlays
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions && pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

function getSortableStyle(
  transform: ReturnType<typeof useSortable>["transform"],
  transition: string | undefined,
) {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
  };
}

function getInitialOpenFolders(folders: SchemaFolder[], activeTableId: string) {
  const ids = new Set<string>();
  if (folders.length > 0) {
    ids.add(folders[0].id);
  }
  if (activeTableId) {
    const folder = folders.find((item) => item.tables.some((table) => table.id === activeTableId));
    if (folder) {
      ids.add(folder.id);
    }
  }
  return ids;
}

function computeAutoOpen(folders: SchemaFolder[], query: string) {
  const folderIds = new Set<string>();
  const tableIds = new Set<string>();

  for (const folder of folders) {
    const folderMatch = folder.name.toLowerCase().includes(query);
    let folderHasMatch = folderMatch;

    for (const table of folder.tables) {
      const tableMatch =
        table.name.toLowerCase().includes(query) || table.logicalName.toLowerCase().includes(query);
      const fieldMatch = table.fields.some(
        (field) =>
          field.name.toLowerCase().includes(query) ||
          field.logicalName.toLowerCase().includes(query),
      );

      if (tableMatch || fieldMatch) {
        folderHasMatch = true;
      }
      if (fieldMatch) {
        tableIds.add(table.id);
      }
    }

    if (folderHasMatch) {
      folderIds.add(folder.id);
    }
  }

  return { folderIds, tableIds };
}

function filterFolders(folders: SchemaFolder[], query: string): SchemaFolder[] {
  const result: SchemaFolder[] = [];

  for (const folder of folders) {
    const folderMatch = folder.name.toLowerCase().includes(query);

    if (folderMatch) {
      result.push(folder);
      continue;
    }

    const tables: SchemaTable[] = [];
    for (const table of folder.tables) {
      const tableMatch =
        table.name.toLowerCase().includes(query) || table.logicalName.toLowerCase().includes(query);

      if (tableMatch) {
        tables.push(table);
        continue;
      }

      const fields = table.fields.filter(
        (field) =>
          field.name.toLowerCase().includes(query) ||
          field.logicalName.toLowerCase().includes(query),
      );

      if (fields.length > 0) {
        tables.push({ ...table, fields });
      }
    }

    if (tables.length > 0) {
      result.push({ ...folder, tables });
    }
  }

  return result;
}

function getFolderSortableId(folderId: string) {
  return `folder:${folderId}`;
}

function getTableSortableId(folderId: string, tableId: string) {
  return `table:${folderId}:${tableId}`;
}

function getFieldHoverId(tableId: string, fieldId: string) {
  return `field:${tableId}:${fieldId}`;
}

function parseSortableId(id: UniqueIdentifier): SortableSchemaItem | null {
  const parts = String(id).split(":");

  if (parts[0] === "folder" && parts[1]) {
    return { type: "folder", folderId: parts[1] };
  }

  if (parts[0] === "table" && parts[1] && parts[2]) {
    return { type: "table", folderId: parts[1], tableId: parts[2] };
  }

  return null;
}

function isOverItem(activeId: UniqueIdentifier | null, item: SortableSchemaItem): boolean {
  if (!activeId) {
    return false;
  }

  const activeItem = parseSortableId(activeId);
  if (!activeItem || activeItem.type !== item.type) {
    return false;
  }

  if (activeItem.type === "folder" && item.type === "folder") {
    return activeItem.folderId === item.folderId;
  }

  if (activeItem.type === "table" && item.type === "table") {
    return activeItem.tableId === item.tableId;
  }

  return false;
}

function unionSets(current: Set<string>, additions: Set<string>) {
  let changed = false;
  for (const value of additions) {
    if (!current.has(value)) {
      changed = true;
      break;
    }
  }
  if (!changed) {
    return current;
  }
  const next = new Set(current);
  for (const value of additions) {
    next.add(value);
  }
  return next;
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

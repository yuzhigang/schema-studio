import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LayersIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState, type PointerEvent } from "react";

import { DesignerHeader } from "./designer-header";
import { DesignerTabs, type DesignerTabId } from "./designer-tabs";
import { FieldGrid } from "./field-grid";
import { insertFieldAfter } from "./field-grid-data";
import { ProjectSidebar } from "./project-sidebar";
import { moveFolder, moveTableInFolder } from "./schema-ordering";
import {
  useCreateCategory,
  useCreateColumn,
  useCreateTable,
  useDeleteCategory,
  useDeleteColumn,
  useDeleteTable,
  useImportProject,
  useMoveTableToFolder,
  useProjectTree,
  useReorderCategories,
  useReorderColumns,
  useReorderTables,
  useSaveTableAsVersion,
  useTeamProjects,
  useUpdateColumn,
  useUpdateTable,
} from "./schema-queries";
import { SchemaTree } from "./schema-tree";
import { applyFieldDraftsToFolders, removeFieldDrafts } from "./schema-tree-data";
import type { SchemaField, TableMetadata } from "./schema-types";
import { findFirstTable, findTableByShortCode, getTablePath } from "./schema-types";
import { toSaveTableVersionFields } from "./schema-version-data";
import { TableMetadataForm } from "./table-metadata-form";
import { useProjectPanelWidth, useTreePanelWidth } from "./use-panel-width";
import { WorkspaceRail } from "./workspace-rail";

type ResizeTarget = "project" | "tree";

type ResizeState = {
  target: ResizeTarget;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
};

type SelectedNode =
  | { type: "folder"; id: string }
  | { type: "table"; id: string }
  | { type: "field"; tableId: string; fieldId: string }
  | null;

type SelectedField = {
  tableId: string;
  fieldId: string;
};

export function SchemaStudioPage({
  teamShortCode,
  projectShortCode,
  tableShortCode,
}: {
  teamShortCode: string;
  projectShortCode?: string;
  tableShortCode?: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: projects = [] } = useTeamProjects(teamShortCode);
  const activeProject = useMemo(
    () => projects.find((project) => project.shortCode === projectShortCode),
    [projects, projectShortCode],
  );
  const activeProjectId = activeProject?.id ?? "";
  const {
    data: folders = [],
    isLoading: treeLoading,
    error: treeError,
  } = useProjectTree(activeProjectId);

  const activeTable = useMemo(
    () => (tableShortCode && findTableByShortCode(tableShortCode, folders)) || undefined,
    [tableShortCode, folders],
  );
  const activeTableId = activeTable?.id ?? "";

  useEffect(() => {
    if (tableShortCode || treeLoading || !activeProjectId || !projectShortCode) {
      return;
    }

    const firstTable = findFirstTable(folders);
    if (!firstTable) {
      return;
    }

    void navigate({
      to: "/team/$teamShortCode/project/$projectShortCode/table/$tableShortCode",
      params: {
        teamShortCode,
        projectShortCode,
        tableShortCode: firstTable.shortCode,
      },
    });
  }, [
    tableShortCode,
    treeLoading,
    activeProjectId,
    projectShortCode,
    folders,
    navigate,
    teamShortCode,
  ]);

  const [activeTab, setActiveTab] = useState<DesignerTabId>("design");
  const {
    width: projectPanelWidth,
    setWidth: setProjectPanelWidth,
    minWidth: projectPanelMinWidth,
    maxWidth: projectPanelMaxWidth,
  } = useProjectPanelWidth();
  const {
    width: treePanelWidth,
    setWidth: setTreePanelWidth,
    minWidth: treePanelMinWidth,
    maxWidth: treePanelMaxWidth,
  } = useTreePanelWidth();
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [selectedField, setSelectedField] = useState<SelectedField | null>(null);
  const [alert, setAlert] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "提示",
    message: "",
  });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "确认",
    message: "",
    onConfirm: () => {},
  });

  const isMutating = useIsMutating({
    predicate: (mutation) => mutation.meta?.background !== true,
  });

  const table = useMemo(() => {
    return (
      activeTable ?? {
        id: "",
        shortCode: "",
        name: "",
        logicalName: "",
        description: "",
        version: 1,
        versionSelected: true,
        fields: [],
      }
    );
  }, [activeTable]);

  const tablePath = useMemo(
    () => getTablePath(activeTableId, folders, activeProject?.name ?? ""),
    [activeTableId, folders, activeProject?.name],
  );

  const [tableDrafts, setTableDrafts] = useState<Record<string, TableMetadata>>({});
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, SchemaField[]>>({});
  const [fieldHistory, setFieldHistory] = useState<
    Record<string, { past: SchemaField[][]; future: SchemaField[][] }>
  >({});

  const metadata = useMemo(() => {
    return (
      tableDrafts[table.id] ?? {
        name: table.name,
        logicalName: table.logicalName,
        description: table.description,
      }
    );
  }, [table, tableDrafts]);

  const fields = useMemo(
    () => fieldDrafts[table.id] ?? table.fields,
    [fieldDrafts, table.id, table.fields],
  );
  const treeFolders = useMemo(
    () => applyFieldDraftsToFolders(folders, fieldDrafts),
    [folders, fieldDrafts],
  );

  useEffect(() => {
    if (!table.id || tableDrafts[table.id]) {
      return;
    }

    // eslint-disable-next-line react-hooks-js/set-state-in-effect
    setTableDrafts((current) => ({
      ...current,
      [table.id]: {
        name: table.name,
        logicalName: table.logicalName,
        description: table.description,
      },
    }));
  }, [table.id, table.name, table.logicalName, table.description, tableDrafts]);

  const updateColumn = useUpdateColumn();
  const updateTable = useUpdateTable();
  const createCategory = useCreateCategory();
  const createTable = useCreateTable();
  const createColumn = useCreateColumn();
  const deleteCategory = useDeleteCategory();
  const deleteTable = useDeleteTable();
  const deleteColumn = useDeleteColumn();
  const reorderCategories = useReorderCategories();
  const reorderTables = useReorderTables();
  const reorderColumns = useReorderColumns();
  const moveTableToFolderMutation = useMoveTableToFolder();
  const saveTableAsVersion = useSaveTableAsVersion();
  const importProject = useImportProject();

  function updateMetadata(nextMetadata: TableMetadata) {
    setTableDrafts((current) => ({
      ...current,
      [table.id]: nextMetadata,
    }));
  }

  function cloneFields(fields: SchemaField[]): SchemaField[] {
    return JSON.parse(JSON.stringify(fields));
  }

  function getCurrentFields(): SchemaField[] {
    return fieldDrafts[table.id] ?? table.fields;
  }

  function handleFieldsChange(nextFields: SchemaField[]) {
    const currentFields = getCurrentFields();
    if (JSON.stringify(currentFields) === JSON.stringify(nextFields)) {
      return;
    }

    setFieldHistory((current) => {
      const tableHistory = current[table.id] ?? { past: [], future: [] };
      return {
        ...current,
        [table.id]: {
          past: [...tableHistory.past, cloneFields(currentFields)],
          future: [],
        },
      };
    });

    setFieldDrafts((current) => ({
      ...current,
      [table.id]: cloneFields(nextFields),
    }));
  }

  function handleUndo() {
    const tableHistory = fieldHistory[table.id];
    if (!tableHistory || tableHistory.past.length === 0) {
      return;
    }

    const currentFields = getCurrentFields();
    const previousFields = tableHistory.past[tableHistory.past.length - 1];
    setFieldHistory((current) => ({
      ...current,
      [table.id]: {
        past: tableHistory.past.slice(0, -1),
        future: [cloneFields(currentFields), ...tableHistory.future],
      },
    }));
    setFieldDrafts((current) => ({
      ...current,
      [table.id]: cloneFields(previousFields),
    }));
  }

  function handleRedo() {
    const tableHistory = fieldHistory[table.id];
    if (!tableHistory || tableHistory.future.length === 0) {
      return;
    }

    const currentFields = getCurrentFields();
    const nextFields = tableHistory.future[0];
    setFieldHistory((current) => ({
      ...current,
      [table.id]: {
        past: [...tableHistory.past, cloneFields(currentFields)],
        future: tableHistory.future.slice(1),
      },
    }));
    setFieldDrafts((current) => ({
      ...current,
      [table.id]: cloneFields(nextFields),
    }));
  }

  function clearFieldDrafts() {
    setFieldDrafts((current) => removeFieldDrafts(current, table.id));
    setFieldHistory((current) => {
      const next = { ...current };
      delete next[table.id];
      return next;
    });
  }

  function handleFieldAdd(afterFieldId: string) {
    if (!table.id) {
      return;
    }

    handleFieldsChange(insertFieldAfter(fields, createEmptyField(), afterFieldId));
  }

  function handleFieldDelete(fieldId: string) {
    if (!table.id) {
      return;
    }

    handleFieldsChange(fields.filter((field) => field.id !== fieldId));
  }

  async function handleImportFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "dmj" && extension !== "sql") {
      setAlert({
        open: true,
        title: "导入失败",
        message: "仅支持 .dmj 和 .sql 后缀的文件",
      });
      return;
    }

    try {
      const content = await file.text();
      const { shortCode } = await importProject.mutateAsync({
        content,
        format: extension,
        fileName: file.name,
      });
      await navigate({
        to: "/team/$teamShortCode/project/$projectShortCode",
        params: { teamShortCode, projectShortCode: shortCode },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入过程中出现未知错误";
      setAlert({
        open: true,
        title: "导入失败",
        message,
      });
    }
  }

  function handleFieldsReorder() {
    // Drag reorder is handled locally via onFieldsChange.
    // The final order is persisted when the user clicks Save.
  }

  async function handleSave() {
    if (!activeProjectId || !table.id) {
      return;
    }

    const originalFields = table.fields;
    const originalMap = new Map(originalFields.map((field) => [field.id, field]));
    const currentFields = fields;
    const currentIds = new Set(currentFields.map((field) => field.id));

    const deletedFields = originalFields.filter((field) => !currentIds.has(field.id));
    const newFields = currentFields.filter((field) => field.id.startsWith("new-"));
    const updatedFields = currentFields.filter((field) => {
      if (field.id.startsWith("new-")) {
        return false;
      }
      const original = originalMap.get(field.id);
      return original && JSON.stringify(field) !== JSON.stringify(original);
    });

    const orderChanged =
      JSON.stringify(currentFields.map((field) => field.id)) !==
      JSON.stringify(originalFields.map((field) => field.id));

    try {
      await Promise.all(
        deletedFields.map((field) =>
          deleteColumn.mutateAsync({ projectId: activeProjectId, columnId: field.id }),
        ),
      );

      await Promise.all(
        updatedFields.map((field) =>
          updateColumn.mutateAsync({
            projectId: activeProjectId,
            columnId: field.id,
            patch: buildFieldPatch(field, originalMap.get(field.id)!),
          }),
        ),
      );

      const idMap = new Map<string, string>();
      for (const field of newFields) {
        const { id: tempId, ...rest } = field;
        const createdId = await createColumn.mutateAsync({
          projectId: activeProjectId,
          tableId: table.id,
          field: rest,
        });
        idMap.set(tempId, createdId);
      }

      if (newFields.length > 0 || deletedFields.length > 0 || orderChanged) {
        const orderedIds = currentFields.map((field) =>
          field.id.startsWith("new-") ? idMap.get(field.id)! : field.id,
        );
        await reorderColumns.mutateAsync({
          projectId: activeProjectId,
          tableId: table.id,
          orderedColumnIds: orderedIds,
        });
      }

      await updateTable.mutateAsync({
        projectId: activeProjectId,
        tableId: table.id,
        metadata,
      });

      clearFieldDrafts();

      void queryClient.invalidateQueries({
        queryKey: ["schema-studio", "project-tree", activeProjectId],
      });
    } catch (error) {
      console.error("Save failed:", error);
      setAlert({
        open: true,
        title: "保存失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSaveAsVersion() {
    if (!activeProjectId || !table.id) {
      return;
    }

    try {
      const result = await saveTableAsVersion.mutateAsync({
        projectId: activeProjectId,
        tableId: table.id,
        metadata,
        fields: toSaveTableVersionFields(fields),
      });

      clearTableState(table.id);

      await queryClient.invalidateQueries({
        queryKey: ["schema-studio", "project-tree", activeProjectId],
      });

      void navigate({
        to: "/team/$teamShortCode/project/$projectShortCode/table/$tableShortCode",
        params: {
          teamShortCode,
          projectShortCode: projectShortCode ?? "",
          tableShortCode: result.shortCode,
        },
      });
    } catch (error) {
      console.error("Save as version failed:", error);
      setAlert({
        open: true,
        title: "保存新版本失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function startResize(
    target: ResizeTarget,
    startWidth: number,
    minWidth: number,
    maxWidth: number,
  ) {
    return (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setResizeState({
        target,
        startX: event.clientX,
        startWidth,
        minWidth,
        maxWidth,
      });
    };
  }

  useEffect(() => {
    if (activeTableId && tableShortCode) {
      // eslint-disable-next-line react-hooks-js/set-state-in-effect
      setSelectedNode({ type: "table", id: activeTableId });
      // eslint-disable-next-line react-hooks-js/set-state-in-effect
      setSelectedField(null);
    } else if (!activeTableId) {
      // eslint-disable-next-line react-hooks-js/set-state-in-effect
      setSelectedNode(null);
      // eslint-disable-next-line react-hooks-js/set-state-in-effect
      setSelectedField(null);
    }
  }, [activeTableId, tableShortCode]);

  useEffect(() => {
    if (!resizeState) {
      return;
    }

    const currentResize = resizeState;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(event: globalThis.PointerEvent) {
      const nextWidth = clamp(
        currentResize.startWidth + event.clientX - currentResize.startX,
        currentResize.minWidth,
        currentResize.maxWidth,
      );

      if (currentResize.target === "project") {
        setProjectPanelWidth(nextWidth);
      } else {
        setTreePanelWidth(nextWidth);
      }
    }

    function handlePointerUp() {
      setResizeState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizeState, setProjectPanelWidth, setTreePanelWidth]);

  function handleFolderMove(activeId: string, overId: string) {
    if (!activeProjectId) {
      return;
    }

    const nextFolders = moveFolder(folders, activeId, overId);
    reorderCategories.mutate({
      projectId: activeProjectId,
      orderedCategoryIds: nextFolders.map((folder) => folder.id),
    });
  }

  function handleTableMove(folderId: string, activeId: string, overId: string) {
    if (!activeProjectId) {
      return;
    }

    const nextFolders = moveTableInFolder(folders, folderId, activeId, overId);
    const folder = nextFolders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }

    reorderTables.mutate({
      projectId: activeProjectId,
      folderId,
      orderedTableIds: folder.tables.map((tableItem) => tableItem.id),
    });
  }

  function handleTableMoveToFolder(tableId: string, folderId: string) {
    if (!activeProjectId) {
      return;
    }

    moveTableToFolderMutation.mutate({
      projectId: activeProjectId,
      tableId,
      targetFolderId: folderId,
    });
  }

  function refreshTree() {
    if (!activeProjectId) {
      return;
    }

    setFieldDrafts((current) => removeFieldDrafts(current));
    setFieldHistory({});

    void queryClient.invalidateQueries({
      queryKey: ["schema-studio", "project-tree", activeProjectId],
    });
  }

  function clearTableState(tableId: string) {
    setFieldDrafts((current) => removeFieldDrafts(current, tableId));
    setFieldHistory((current) => {
      if (!(tableId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[tableId];
      return next;
    });
    setTableDrafts((current) => {
      if (!(tableId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[tableId];
      return next;
    });
  }

  function leaveDeletedTable() {
    if (!projectShortCode) {
      return;
    }

    void navigate({
      to: "/team/$teamShortCode/project/$projectShortCode",
      params: { teamShortCode, projectShortCode },
    });
  }

  function handleAddGroup() {
    if (!activeProjectId) {
      return;
    }

    createCategory.mutate({ projectId: activeProjectId, name: "新分组" });
  }

  function handleAddTable(folderId: string) {
    if (!activeProjectId) {
      return;
    }

    createTable.mutate({ projectId: activeProjectId, folderId, metadata: createEmptyTable() });
  }

  function handleDeleteFolder(folderId: string) {
    if (!activeProjectId) {
      return;
    }

    setConfirm({
      open: true,
      title: "删除分组",
      message: "确定删除该分组及其下所有表吗？",
      onConfirm: () => {
        const folder = folders.find((item) => item.id === folderId);
        const tableIds = folder?.tables.map((tableItem) => tableItem.id) ?? [];
        const removingActiveTable = tableIds.includes(activeTableId);

        deleteCategory.mutate({ projectId: activeProjectId, categoryId: folderId });
        tableIds.forEach(clearTableState);
        if (removingActiveTable) {
          leaveDeletedTable();
        }
        setConfirm((current) => ({ ...current, open: false }));
      },
    });
  }

  function handleAddField(tableId: string) {
    if (!activeProjectId) {
      return;
    }

    createColumn.mutate({ projectId: activeProjectId, tableId, field: createEmptyField() });
  }

  function handleDeleteTable(tableId: string) {
    if (!activeProjectId) {
      return;
    }

    setConfirm({
      open: true,
      title: "删除表",
      message: "确定删除该表及其下所有字段吗？",
      onConfirm: () => {
        deleteTable.mutate({ projectId: activeProjectId, tableId });
        clearTableState(tableId);
        if (tableId === activeTableId) {
          leaveDeletedTable();
        }
        setConfirm((current) => ({ ...current, open: false }));
      },
    });
  }

  function handleDeleteField(tableId: string, fieldId: string) {
    if (!activeProjectId) {
      return;
    }

    setConfirm({
      open: true,
      title: "删除字段",
      message: "确定删除该字段吗？",
      onConfirm: () => {
        deleteColumn.mutate({ projectId: activeProjectId, columnId: fieldId });
        clearTableState(tableId);
        setConfirm((current) => ({ ...current, open: false }));
      },
    });
  }

  return (
    <div className="flex h-svh min-w-[1180px] flex-col overflow-hidden bg-slate-50 text-slate-900">
      {isMutating > 0 && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/5">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <Loader2Icon className="size-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">处理中…</span>
          </div>
        </div>
      )}

      <AlertDialog
        open={alert.open}
        onOpenChange={(open) => setAlert((current) => ({ ...current, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alert.title}</AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert((current) => ({ ...current, open: false }))}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((current) => ({ ...current, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirm((current) => ({ ...current, open: false }))}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirm.onConfirm}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
            <LayersIcon className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">数据库设计平台</h1>
        </div>
        <div className="relative w-[560px] max-w-[42vw]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索项目、表、字段、注释..."
            className="h-10 rounded-md border-slate-200 bg-white pl-9 shadow-none"
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceRail activeTeamShortCode={teamShortCode} />
        <div className="h-full shrink-0" style={{ width: projectPanelWidth }}>
          <ProjectSidebar
            teamShortCode={teamShortCode}
            activeProjectShortCode={projectShortCode}
            onProjectChange={(shortCode) => {
              setSelectedNode(null);
              setSelectedField(null);
              void navigate({
                to: "/team/$teamShortCode/project/$projectShortCode",
                params: { teamShortCode, projectShortCode: shortCode },
              });
            }}
            onImportFile={handleImportFile}
          />
        </div>
        <ResizeDivider
          label="调整项目列表宽度"
          active={resizeState?.target === "project"}
          onPointerDown={startResize(
            "project",
            projectPanelWidth,
            projectPanelMinWidth,
            projectPanelMaxWidth,
          )}
        />
        <div className="h-full shrink-0" style={{ width: treePanelWidth }}>
          {activeProjectId ? (
            treeLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                加载中…
              </div>
            ) : treeError ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-red-600">
                <p>加载树失败</p>
                <p className="mt-1 text-xs text-slate-500">{treeError.message}</p>
              </div>
            ) : (
              <SchemaTree
                key={activeProjectId}
                folders={treeFolders}
                selectedNode={selectedNode}
                activeTableShortCode={tableShortCode}
                onFolderMove={handleFolderMove}
                onTableMove={handleTableMove}
                onTableMoveToFolder={handleTableMoveToFolder}
                onAddGroup={handleAddGroup}
                onRefresh={refreshTree}
                onAddTable={handleAddTable}
                onDeleteFolder={handleDeleteFolder}
                onAddField={handleAddField}
                onDeleteTable={handleDeleteTable}
                onDeleteField={handleDeleteField}
                onFolderChange={(folderId) => {
                  setSelectedNode({ type: "folder", id: folderId });
                  setSelectedField(null);
                }}
                onTableChange={(shortCode) => {
                  void navigate({
                    to: "/team/$teamShortCode/project/$projectShortCode/table/$tableShortCode",
                    params: {
                      teamShortCode,
                      projectShortCode: projectShortCode ?? "",
                      tableShortCode: shortCode,
                    },
                  });
                }}
                onFieldChange={(tableId, fieldId) => {
                  setSelectedNode({ type: "field", tableId, fieldId });
                  setSelectedField({ tableId, fieldId });
                }}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              请选择项目
            </div>
          )}
        </div>
        <ResizeDivider
          label="调整表格列表宽度"
          active={resizeState?.target === "tree"}
          onPointerDown={startResize("tree", treePanelWidth, treePanelMinWidth, treePanelMaxWidth)}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {table.id ? (
            <>
              <DesignerHeader
                projectId={activeProjectId}
                tableId={table.id}
                path={tablePath}
                metadata={metadata}
                onSave={handleSave}
                onSaveAsVersion={handleSaveAsVersion}
                onVersionChange={(nextTableShortCode) => {
                  void navigate({
                    to: "/team/$teamShortCode/project/$projectShortCode/table/$tableShortCode",
                    params: {
                      teamShortCode,
                      projectShortCode: projectShortCode ?? "",
                      tableShortCode: nextTableShortCode,
                    },
                  });
                }}
              />
              <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
                <DesignerTabs activeTab={activeTab} onTabChange={setActiveTab} />
                {activeTab === "design" ? (
                  <div className="pt-4">
                    <TableMetadataForm metadata={metadata} onMetadataChange={updateMetadata} />
                    <FieldGrid
                      fields={fields}
                      selectedFieldId={
                        selectedField?.tableId === table.id ? selectedField.fieldId : null
                      }
                      onFieldSelect={(fieldId) => setSelectedField({ tableId: table.id, fieldId })}
                      onFieldsChange={handleFieldsChange}
                      onFieldAdd={handleFieldAdd}
                      onFieldDelete={handleFieldDelete}
                      onFieldsReorder={handleFieldsReorder}
                      canUndo={Boolean(fieldHistory[table.id]?.past.length)}
                      canRedo={Boolean(fieldHistory[table.id]?.future.length)}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    当前原型仅实现表设计主流程，后续版本会补充此模块。
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              暂无数据
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ResizeDivider({
  label,
  active,
  onPointerDown,
}: {
  label: string;
  active: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative w-2 shrink-0 cursor-col-resize bg-white transition-colors outline-none hover:bg-blue-50 focus-visible:bg-blue-50",
        active && "bg-blue-50",
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-slate-200 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500",
          active && "bg-blue-500",
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          active && "bg-blue-500 opacity-100",
        )}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

let emptyTableIndex = 0;
function createEmptyTable(): TableMetadata {
  emptyTableIndex += 1;
  return {
    name: `NewTable${emptyTableIndex}`,
    logicalName: "新表",
    description: "",
  };
}

let emptyFieldIndex = 0;
function createEmptyField(): SchemaField {
  emptyFieldIndex += 1;
  return {
    id: `new-${crypto.randomUUID()}`,
    name: `NewField${emptyFieldIndex}`,
    logicalName: "新字段",
    dataType: "text",
    length: 64,
    primaryKey: false,
    nullable: false,
    autoIncrement: false,
    index: false,
    defaultValue: null,
    description: "",
  };
}

function buildFieldPatch(draft: SchemaField, original: SchemaField): Partial<SchemaField> {
  const patch: Partial<SchemaField> = {};

  if (draft.name !== original.name) patch.name = draft.name;
  if (draft.logicalName !== original.logicalName) patch.logicalName = draft.logicalName;
  if (draft.dataType !== original.dataType) patch.dataType = draft.dataType;
  if (draft.length !== original.length) patch.length = draft.length;
  if (draft.primaryKey !== original.primaryKey) patch.primaryKey = draft.primaryKey;
  if (draft.nullable !== original.nullable) patch.nullable = draft.nullable;
  if (draft.autoIncrement !== original.autoIncrement) patch.autoIncrement = draft.autoIncrement;
  if (draft.index !== original.index) patch.index = draft.index;
  if (draft.uniqueFlag !== original.uniqueFlag) patch.uniqueFlag = draft.uniqueFlag;
  if (draft.defaultValue !== original.defaultValue) patch.defaultValue = draft.defaultValue;
  if (draft.comment !== original.comment) patch.comment = draft.comment;
  if (draft.description !== original.description) patch.description = draft.description;
  if (draft.fkTableId !== original.fkTableId) patch.fkTableId = draft.fkTableId;
  if (draft.fkColumnId !== original.fkColumnId) patch.fkColumnId = draft.fkColumnId;

  return patch;
}

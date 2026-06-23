import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { LayersIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState, type PointerEvent } from "react";

import { DesignerHeader } from "./designer-header";
import { DesignerTabs, type DesignerTabId } from "./designer-tabs";
import { FieldGrid } from "./field-grid";
import {
  findTableById,
  getTablePath,
  initialProjectId,
  initialTableId,
  schemaFolders,
  type TableMetadata,
} from "./mock-data";
import { ProjectSidebar } from "./project-sidebar";
import { moveFieldInTable, moveFolder, moveTableInFolder } from "./schema-ordering";
import { SchemaTree } from "./schema-tree";
import { TableMetadataForm } from "./table-metadata-form";
import { WorkspaceRail } from "./workspace-rail";

type ResizeTarget = "project" | "tree";

type ResizeState = {
  target: ResizeTarget;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
};

type SelectedField = {
  tableId: string;
  fieldId: string;
};

export function SchemaStudioPage() {
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [activeTab, setActiveTab] = useState<DesignerTabId>("design");
  const [savedLabel, setSavedLabel] = useState("保存");
  const [projectPanelWidth, setProjectPanelWidth] = useState(212);
  const [treePanelWidth, setTreePanelWidth] = useState(430);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [folders, setFolders] = useState(schemaFolders);
  const [selectedField, setSelectedField] = useState<SelectedField | null>(null);
  const table = findTableById(activeTableId, folders);
  const tablePath = getTablePath(activeTableId, folders);
  const [tableDrafts, setTableDrafts] = useState<Record<string, TableMetadata>>(() => ({
    [table.id]: {
      name: table.name,
      logicalName: table.logicalName,
      description: table.description,
    },
  }));

  const metadata = useMemo(() => {
    return (
      tableDrafts[table.id] ?? {
        name: table.name,
        logicalName: table.logicalName,
        description: table.description,
      }
    );
  }, [table, tableDrafts]);

  function updateMetadata(nextMetadata: TableMetadata) {
    setTableDrafts((current) => ({
      ...current,
      [table.id]: nextMetadata,
    }));
  }

  function handleSave() {
    setSavedLabel("已保存");
    window.setTimeout(() => setSavedLabel("保存"), 1200);
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
  }, [resizeState]);

  return (
    <div className="flex h-svh min-w-[1180px] flex-col overflow-hidden bg-slate-50 text-slate-900">
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
        <WorkspaceRail />
        <div className="h-full shrink-0" style={{ width: projectPanelWidth }}>
          <ProjectSidebar activeProjectId={activeProjectId} onProjectChange={setActiveProjectId} />
        </div>
        <ResizeDivider
          label="调整项目列表宽度"
          active={resizeState?.target === "project"}
          onPointerDown={startResize("project", projectPanelWidth, 168, 320)}
        />
        <div className="h-full shrink-0" style={{ width: treePanelWidth }}>
          <SchemaTree
            folders={folders}
            activeTableId={activeTableId}
            selectedFieldTableId={selectedField?.tableId ?? null}
            selectedFieldId={selectedField?.fieldId ?? null}
            onFolderMove={(activeId, overId) =>
              setFolders((current) => moveFolder(current, activeId, overId))
            }
            onTableMove={(folderId, activeId, overId) =>
              setFolders((current) => moveTableInFolder(current, folderId, activeId, overId))
            }
            onFieldMove={(tableId, activeId, overId) =>
              setFolders((current) => moveFieldInTable(current, tableId, activeId, overId))
            }
            onTableChange={(tableId) => {
              setActiveTableId(tableId);
              setSelectedField(null);
            }}
            onFieldChange={(tableId, fieldId) => setSelectedField({ tableId, fieldId })}
          />
        </div>
        <ResizeDivider
          label="调整表格列表宽度"
          active={resizeState?.target === "tree"}
          onPointerDown={startResize("tree", treePanelWidth, 300, 640)}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DesignerHeader
            path={tablePath}
            metadata={metadata}
            saveLabel={savedLabel}
            onSave={handleSave}
          />
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
            <DesignerTabs activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === "design" ? (
              <div className="pt-4">
                <TableMetadataForm metadata={metadata} onMetadataChange={updateMetadata} />
                <FieldGrid
                  fields={table.fields}
                  selectedFieldId={
                    selectedField?.tableId === table.id ? selectedField.fieldId : null
                  }
                  onFieldSelect={(fieldId) => setSelectedField({ tableId: table.id, fieldId })}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">
                当前原型仅实现表设计主流程，后续版本会补充此模块。
              </div>
            )}
          </div>
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

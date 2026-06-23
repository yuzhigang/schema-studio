import { useMemo, useState } from "react";

import { DesignerHeader } from "./designer-header";
import { DesignerTabs, type DesignerTabId } from "./designer-tabs";
import { FieldGrid } from "./field-grid";
import {
  findTableById,
  getTablePath,
  initialProjectId,
  initialTableId,
  type TableMetadata,
} from "./mock-data";
import { ProjectSidebar } from "./project-sidebar";
import { SchemaTree } from "./schema-tree";
import { TableMetadataForm } from "./table-metadata-form";
import { WorkspaceRail } from "./workspace-rail";

export function SchemaStudioPage() {
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const [activeTableId, setActiveTableId] = useState(initialTableId);
  const [activeTab, setActiveTab] = useState<DesignerTabId>("design");
  const [savedLabel, setSavedLabel] = useState("保存");
  const table = findTableById(activeTableId);
  const tablePath = getTablePath(activeTableId);
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

  return (
    <div className="flex h-svh min-w-[1180px] overflow-hidden bg-slate-50 text-slate-900">
      <WorkspaceRail />
      <ProjectSidebar activeProjectId={activeProjectId} onProjectChange={setActiveProjectId} />
      <SchemaTree activeTableId={activeTableId} onTableChange={setActiveTableId} />
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
              <FieldGrid fields={table.fields} />
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">
              当前原型仅实现表设计主流程，后续版本会补充此模块。
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

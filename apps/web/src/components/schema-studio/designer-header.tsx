import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  ChevronRightIcon,
  CopyIcon,
  HistoryIcon,
  RefreshCwIcon,
  SaveIcon,
  Table2Icon,
  UploadIcon,
} from "lucide-react";

import {
  useCreateTableVersion,
  useSetSelectedTableVersion,
  useSyncTableFromRef,
  useTableVersions,
} from "./schema-queries";
import type { SchemaTable, TableMetadata } from "./schema-types";

type DesignerHeaderProps = {
  projectId: string;
  tableId: string;
  path: {
    projectName: string;
    folderName: string;
    table: SchemaTable;
  };
  metadata: TableMetadata;
  saveLabel: string;
  onSave: () => void;
  onVersionChange?: (tableShortCode: string) => void;
};

export function DesignerHeader({
  projectId,
  tableId,
  path,
  metadata,
  saveLabel,
  onSave,
  onVersionChange,
}: DesignerHeaderProps) {
  const { data: versions = [] } = useTableVersions(tableId, projectId);
  const createVersion = useCreateTableVersion();
  const setSelectedVersion = useSetSelectedTableVersion();
  const syncFromRef = useSyncTableFromRef();

  const canEdit = Boolean(projectId && tableId);
  const currentVersion = versions.find((v) => v.id === tableId)?.version ?? path.table.version;
  const currentShortCode = versions.find((v) => v.id === tableId)?.shortCode ?? "";
  const hasRef = Boolean(path.table.refTableId);

  function handleCreateVersion() {
    if (!canEdit) return;
    createVersion.mutate(
      { projectId, tableId },
      {
        onSuccess: (result) => {
          onVersionChange?.(result.shortCode);
        },
      },
    );
  }

  function handleSelectVersion(shortCode: string) {
    const version = versions.find((v) => v.shortCode === shortCode);
    if (!canEdit || !version || version.id === tableId) return;
    setSelectedVersion.mutate(
      { projectId, tableId: version.id },
      {
        onSuccess: () => {
          onVersionChange?.(version.shortCode);
        },
      },
    );
  }

  function handleSync() {
    if (!canEdit || !hasRef) return;
    syncFromRef.mutate({ projectId, tableId });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-1 text-sm text-slate-500">
              <span>{path.projectName}</span>
              <ChevronRightIcon className="size-4" />
              <span>{path.folderName}</span>
              <ChevronRightIcon className="size-4" />
              <span className="truncate font-medium text-slate-700">
                {metadata.name}
                {metadata.logicalName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">
                {metadata.name}
                {metadata.logicalName}
              </h1>
              <span className="inline-flex h-7 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-600">
                <Table2Icon className="size-4" />
                数据表
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
              <HistoryIcon className="size-4 text-slate-500" />
              <span className="text-sm text-slate-600">版本 {currentVersion}</span>
              <Select
                value={currentShortCode}
                onValueChange={(value) => handleSelectVersion(value ?? "")}
                disabled={versions.length <= 1}
              >
                <SelectTrigger className="h-7 w-[140px] border-slate-200 text-sm">
                  <SelectValue placeholder="切换版本" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.shortCode}>
                      版本 {version.version}
                      {version.versionSelected ? "（当前）" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                title="新建版本"
                disabled={!canEdit}
                onClick={handleCreateVersion}
              >
                <CopyIcon className="size-4" />
              </Button>
              {hasRef && (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  title="同步来源表元数据"
                  disabled={!canEdit}
                  onClick={handleSync}
                >
                  <RefreshCwIcon className="size-4" />
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-slate-200 bg-white shadow-none"
            >
              <UploadIcon data-icon="inline-start" className="size-4" />
              导出
            </Button>
            <Button
              type="button"
              onClick={onSave}
              className="rounded-md bg-blue-600 shadow-none hover:bg-blue-700"
            >
              <SaveIcon data-icon="inline-start" className="size-4" />
              {saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

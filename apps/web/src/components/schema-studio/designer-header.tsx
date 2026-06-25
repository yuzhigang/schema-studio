import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  HistoryIcon,
  RefreshCwIcon,
  SaveIcon,
  TagIcon,
  UploadIcon,
} from "lucide-react";

import {
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
  onSave: () => void;
  onSaveAsVersion: () => void;
  onVersionChange?: (tableShortCode: string) => void;
};

export function DesignerHeader({
  projectId,
  tableId,
  path,
  metadata,
  onSave,
  onSaveAsVersion,
  onVersionChange,
}: DesignerHeaderProps) {
  const { data: versions = [] } = useTableVersions(tableId, projectId);
  const setSelectedVersion = useSetSelectedTableVersion();
  const syncFromRef = useSyncTableFromRef();

  const canEdit = Boolean(projectId && tableId);
  const currentVersion = versions.find((v) => v.id === tableId)?.version ?? path.table.version;
  const hasRef = Boolean(path.table.refTableId);

  async function handleSelectVersion(shortCode: string) {
    const version = versions.find((v) => v.shortCode === shortCode);
    if (!canEdit || !version || version.id === tableId) return;
    // Use mutateAsync so navigation runs only AFTER the hook's onSuccess has
    // awaited the tree refetch. The per-call onSuccess of mutate() can fire as
    // soon as the mutation resolves — before the awaited invalidation settles —
    // so it would navigate to the new short code while the tree is still stale,
    // and the page only corrected on a full reload.
    await setSelectedVersion.mutateAsync({ projectId, tableId: version.id });
    onVersionChange?.(version.shortCode);
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
            <div className="mb-2 flex min-w-0 items-center gap-1 text-sm text-slate-500">
              <span className="hidden max-w-48 shrink truncate sm:inline">{path.projectName}</span>
              <ChevronRightIcon className="hidden size-4 shrink-0 sm:inline" />
              <span className="max-w-40 shrink truncate">{path.folderName}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">
                {metadata.name}
                {metadata.logicalName}
              </h1>
              <span className="inline-flex h-7 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-600">
                <TagIcon className="size-4" />V{currentVersion}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={versions.length === 0}
                    className="rounded-md border-slate-200 bg-white shadow-none"
                  />
                }
              >
                <HistoryIcon data-icon="inline-start" className="size-4 text-slate-500" />V
                {currentVersion}
                <ChevronDownIcon data-icon="inline-end" className="size-4 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {versions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => void handleSelectVersion(version.shortCode)}
                  >
                    <CheckIcon
                      data-icon="inline-start"
                      className={
                        version.id === tableId ? "size-4 text-blue-600" : "size-4 text-transparent"
                      }
                    />
                    版本 {version.version}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              variant="outline"
              disabled={!canEdit}
              onClick={onSaveAsVersion}
              className="rounded-md border-slate-200 bg-white shadow-none"
            >
              <CopyIcon data-icon="inline-start" className="size-4" />
              保存为新版本
            </Button>
            <Button
              type="button"
              disabled={!canEdit}
              onClick={onSave}
              className="rounded-md bg-blue-600 shadow-none hover:bg-blue-700"
            >
              <SaveIcon data-icon="inline-start" className="size-4" />
              保存
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

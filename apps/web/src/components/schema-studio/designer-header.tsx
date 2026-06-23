import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  ChevronRightIcon,
  HistoryIcon,
  SaveIcon,
  SearchIcon,
  Table2Icon,
  UploadIcon,
} from "lucide-react";

import type { SchemaTable, TableMetadata } from "./mock-data";

type DesignerHeaderProps = {
  path: {
    projectName: string;
    folderName: string;
    table: SchemaTable;
  };
  metadata: TableMetadata;
  saveLabel: string;
  onSave: () => void;
};

export function DesignerHeader({ path, metadata, saveLabel, onSave }: DesignerHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-[58px] items-center justify-end px-4">
        <div className="relative w-[560px] max-w-[48vw]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索项目、表、字段、注释..."
            className="h-9 rounded-md border-slate-200 bg-white pl-9 shadow-none"
          />
        </div>
      </div>
      <div className="px-4 pb-3">
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
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-slate-200 bg-white shadow-none"
            >
              <HistoryIcon data-icon="inline-start" className="size-4" />
              版本历史
            </Button>
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

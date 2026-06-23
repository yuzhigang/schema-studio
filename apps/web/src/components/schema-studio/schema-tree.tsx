import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  FolderIcon,
  KeyRoundIcon,
  PlusIcon,
  SearchIcon,
  Table2Icon,
  TypeIcon,
} from "lucide-react";
import { useState } from "react";

import { schemaFolders, type SchemaField } from "./mock-data";

type SchemaTreeProps = {
  activeTableId: string;
  onTableChange: (tableId: string) => void;
};

export function SchemaTree({ activeTableId, onTableChange }: SchemaTreeProps) {
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState(
    () => new Set(["common", "gantt", "material-analysis", "directory"]),
  );
  const [openTables, setOpenTables] = useState(() => new Set([activeTableId]));

  function toggleFolder(folderId: string) {
    setOpenFolders((current) => toggleSetValue(current, folderId));
  }

  function toggleTable(tableId: string) {
    setOpenTables((current) => toggleSetValue(current, tableId));
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
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-5 text-sm">
        {schemaFolders.map((folder) => {
          const folderOpen = openFolders.has(folder.id);

          return (
            <div key={folder.id}>
              <div className="flex h-8 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                  aria-label={folderOpen ? "收起目录" : "展开目录"}
                >
                  {folderOpen ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
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
              {folderOpen &&
                folder.tables.map((table) => {
                  const tableOpen = openTables.has(table.id);
                  const active = activeTableId === table.id;

                  return (
                    <div key={table.id} className="ml-5">
                      <div
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-md pr-2",
                          active && "bg-blue-50 text-blue-700",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTable(table.id)}
                          className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                          aria-label={tableOpen ? "收起表" : "展开表"}
                        >
                          {tableOpen ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
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
                      {tableOpen && (
                        <div className="ml-7 border-l border-slate-200 pl-3">
                          {table.fields.map((field) => (
                            <FieldTreeItem key={field.id} field={field} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function FieldTreeItem({ field }: { field: SchemaField }) {
  return (
    <div className="flex h-8 items-center gap-2 text-slate-700">
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

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

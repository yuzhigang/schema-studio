import { Input } from "@repo/ui/components/input";

import type { TableMetadata } from "./mock-data";

type TableMetadataFormProps = {
  metadata: TableMetadata;
  onMetadataChange: (metadata: TableMetadata) => void;
};

export function TableMetadataForm({ metadata, onMetadataChange }: TableMetadataFormProps) {
  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-[48px_1fr_64px_1fr] items-center gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="table-name">
          表名:
        </label>
        <Input
          id="table-name"
          value={metadata.name}
          onChange={(event) => onMetadataChange({ ...metadata, name: event.target.value })}
          className="h-10 rounded-md border-slate-200 bg-white shadow-none"
        />
        <label className="text-sm font-medium text-slate-700" htmlFor="table-logical-name">
          逻辑名:
        </label>
        <Input
          id="table-logical-name"
          value={metadata.logicalName}
          onChange={(event) => onMetadataChange({ ...metadata, logicalName: event.target.value })}
          className="h-10 rounded-md border-slate-200 bg-white shadow-none"
        />
      </div>
      <div className="grid grid-cols-[48px_1fr] items-start gap-3">
        <label className="pt-2 text-sm font-medium text-slate-700" htmlFor="table-description">
          注释:
        </label>
        <textarea
          id="table-description"
          value={metadata.description}
          onChange={(event) => onMetadataChange({ ...metadata, description: event.target.value })}
          className="min-h-20 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none transition-[box-shadow,border-color] outline-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20"
        />
      </div>
    </section>
  );
}

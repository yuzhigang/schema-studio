import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  CircleMinusIcon,
  CirclePlusIcon,
  GripVerticalIcon,
  KeyRoundIcon,
  TypeIcon,
} from "lucide-react";

import type { SchemaField, SchemaFieldType } from "./mock-data";

const typeLabels: Record<SchemaFieldType, string> = {
  integer: "整数",
  text: "文本",
  boolean: "真假",
};

const typeStyles: Record<SchemaFieldType, string> = {
  integer: "border-orange-300 bg-orange-50 text-orange-600",
  text: "border-blue-300 bg-blue-50 text-blue-600",
  boolean: "border-emerald-300 bg-emerald-50 text-emerald-600",
};

type FieldGridProps = {
  fields: SchemaField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
};

export function FieldGrid({ fields, selectedFieldId, onFieldSelect }: FieldGridProps) {
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">字段设计（共{fields.length}个）</h2>
        <Button
          type="button"
          variant="outline"
          className="rounded-md border-slate-200 bg-white text-slate-700 shadow-none"
        >
          大小写转换
        </Button>
      </div>
      <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-900">
            <tr className="h-10 border-b border-slate-200">
              <th className="w-10 px-2 text-left font-semibold" />
              <th className="w-[12%] px-3 text-left font-semibold">字段名</th>
              <th className="w-[12%] px-3 text-left font-semibold">逻辑名</th>
              <th className="w-[10%] px-3 text-left font-semibold">数据类型</th>
              <th className="w-[7%] px-3 text-left font-semibold">长度</th>
              <th className="w-[6%] px-3 text-center font-semibold">主键</th>
              <th className="w-[6%] px-3 text-center font-semibold">非空</th>
              <th className="w-[6%] px-3 text-center font-semibold">自增</th>
              <th className="w-[6%] px-3 text-center font-semibold">更新</th>
              <th className="px-3 text-left font-semibold">说明</th>
              <th className="w-16 px-3 text-center font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {fields.length > 0 ? (
              fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  selected={selectedFieldId === field.id}
                  onFieldSelect={onFieldSelect}
                />
              ))
            ) : (
              <tr>
                <td className="h-24 text-center text-slate-500" colSpan={11}>
                  当前表暂无字段
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FieldRow({
  field,
  selected,
  onFieldSelect,
}: {
  field: SchemaField;
  selected: boolean;
  onFieldSelect: (fieldId: string) => void;
}) {
  return (
    <tr
      onClick={() => onFieldSelect(field.id)}
      className={cn(
        "h-10 cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-slate-50",
        selected && "bg-blue-50 hover:bg-blue-50",
      )}
    >
      <td className="px-2 text-slate-400">
        <div className="flex items-center gap-1">
          <GripVerticalIcon className="size-4" />
          {field.primaryKey ? (
            <KeyRoundIcon className="size-4 text-orange-500" />
          ) : field.dataType === "boolean" ? (
            <span className="flex size-4 items-center justify-center rounded border border-emerald-500">
              <span className="size-2 rounded-sm bg-emerald-500" />
            </span>
          ) : (
            <TypeIcon className="size-4 text-slate-500" />
          )}
        </div>
      </td>
      <td className="truncate px-3 font-medium text-slate-800">{field.name}</td>
      <td className="truncate px-3 text-slate-800">{field.logicalName}</td>
      <td className="px-3">
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full border px-3 text-xs font-medium",
            typeStyles[field.dataType],
          )}
        >
          {typeLabels[field.dataType]}
        </span>
      </td>
      <td className="px-3 text-slate-700">{field.length}</td>
      <td className="px-3 text-center">
        <FieldCheckbox checked={field.primaryKey} />
      </td>
      <td className="px-3 text-center">
        <FieldCheckbox checked={field.notNull} />
      </td>
      <td className="px-3 text-center">
        <FieldCheckbox checked={field.autoIncrement} />
      </td>
      <td className="px-3 text-center">
        <FieldCheckbox checked={field.updated} />
      </td>
      <td className="truncate px-3 text-slate-700">{field.description}</td>
      <td className="px-3">
        <div className="flex items-center justify-center gap-1 text-slate-500">
          <CircleMinusIcon className="size-4" />
          <CirclePlusIcon className="size-4" />
        </div>
      </td>
    </tr>
  );
}

function FieldCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-4 items-center justify-center rounded border",
        checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400 bg-white",
      )}
    >
      {checked && <span className="size-1.5 rounded-sm bg-white" />}
    </span>
  );
}

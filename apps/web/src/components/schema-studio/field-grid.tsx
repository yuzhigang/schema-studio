import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import {
  GripVerticalIcon,
  KeyRoundIcon,
  PlusIcon,
  Redo2Icon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";

import {
  type SchemaField,
  type SchemaFieldType,
  schemaFieldTypeLabels,
  schemaFieldTypes,
} from "./schema-types";

type FieldGridProps = {
  fields: SchemaField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldsChange: (fields: SchemaField[]) => void;
  onFieldAdd: () => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldsReorder: (orderedFieldIds: string[]) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

const typeStyles: Record<SchemaFieldType, string> = {
  integer: "border-orange-300 bg-orange-50 text-orange-600",
  float: "border-yellow-300 bg-yellow-50 text-yellow-600",
  text: "border-blue-300 bg-blue-50 text-blue-600",
  boolean: "border-emerald-300 bg-emerald-50 text-emerald-600",
  date: "border-purple-300 bg-purple-50 text-purple-600",
  time: "border-pink-300 bg-pink-50 text-pink-600",
  datetime: "border-indigo-300 bg-indigo-50 text-indigo-600",
  enum: "border-cyan-300 bg-cyan-50 text-cyan-600",
};

function hasLength(type: SchemaFieldType) {
  return type === "integer" || type === "float" || type === "text" || type === "enum";
}

function defaultValueOptions(type: SchemaFieldType) {
  const custom = { value: "__custom__", label: "自定义" };
  const nullOption = { value: "__null__", label: "NULL" };

  switch (type) {
    case "integer":
    case "float":
      return [nullOption, { value: "0", label: "0" }, { value: "1", label: "1" }, custom];
    case "boolean":
      return [nullOption, { value: "true", label: "true" }, { value: "false", label: "false" }];
    case "date":
      return [nullOption, { value: "CURRENT_DATE", label: "当前日期" }, custom];
    case "time":
      return [nullOption, { value: "CURRENT_TIME", label: "当前时间" }, custom];
    case "datetime":
      return [nullOption, { value: "CURRENT_TIMESTAMP", label: "当前时间戳" }, custom];
    case "text":
    case "enum":
    default:
      return [nullOption, { value: "", label: "空字符串" }, custom];
  }
}

function normalizeDefaultValue(type: SchemaFieldType, value: string | null | undefined) {
  if (value === null || value === undefined) return "__null__";
  const options = defaultValueOptions(type);
  return options.some((o) => o.value === value) ? value : "__custom__";
}

export function FieldGrid({
  fields,
  selectedFieldId,
  onFieldSelect,
  onFieldsChange,
  onFieldAdd,
  onFieldDelete,
  onFieldsReorder,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: FieldGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateField(id: string, patch: Partial<SchemaField>) {
    onFieldsChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextFields = arrayMove(fields, oldIndex, newIndex);
    onFieldsChange(nextFields);
    onFieldsReorder(nextFields.map((field) => field.id));
  }

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">字段设计（共{fields.length}个）</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
            className="rounded-md border-slate-200 bg-white text-slate-700 shadow-none disabled:opacity-40"
          >
            <Undo2Icon className="mr-1 size-4" />
            撤销
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
            className="rounded-md border-slate-200 bg-white text-slate-700 shadow-none disabled:opacity-40"
          >
            <Redo2Icon className="mr-1 size-4" />
            恢复
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFieldAdd}
            className="rounded-md border-slate-200 bg-white text-slate-700 shadow-none"
          >
            <PlusIcon className="mr-1 size-4" />
            新增字段
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-900">
              <tr className="h-10 border-b border-slate-200">
                <th className="w-10 px-2 text-left font-semibold" />
                <th className="w-[13%] px-2 text-left font-semibold">字段名</th>
                <th className="w-[11%] px-2 text-left font-semibold">逻辑名</th>
                <th className="w-[10%] px-2 text-left font-semibold">数据类型</th>
                <th className="w-[7%] px-2 text-left font-semibold">长度</th>
                <th className="w-[6%] px-1 text-center font-semibold">主键</th>
                <th className="w-[6%] px-1 text-center font-semibold">可空</th>
                <th className="w-[6%] px-1 text-center font-semibold">自增</th>
                <th className="w-[6%] px-1 text-center font-semibold">索引</th>
                <th className="w-[13%] px-2 text-left font-semibold">默认值</th>
                <th className="px-2 text-left font-semibold">说明</th>
                <th className="w-14 px-2 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {fields.length > 0 ? (
                  fields.map((field) => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      selected={selectedFieldId === field.id}
                      onFieldSelect={onFieldSelect}
                      onFieldChange={(patch) => updateField(field.id, patch)}
                      onFieldDelete={onFieldDelete}
                    />
                  ))
                ) : (
                  <tr>
                    <td className="h-24 text-center text-slate-500" colSpan={12}>
                      当前表暂无字段
                    </td>
                  </tr>
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </section>
  );
}

function SortableFieldRow({
  field,
  selected,
  onFieldSelect,
  onFieldChange,
  onFieldDelete,
}: {
  field: SchemaField;
  selected: boolean;
  onFieldSelect: (fieldId: string) => void;
  onFieldChange: (patch: Partial<SchemaField>) => void;
  onFieldDelete: (fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { fieldId: field.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={() => onFieldSelect(field.id)}
      className={cn(
        "h-10 cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-slate-50",
        selected && "bg-blue-50 hover:bg-blue-50",
        isDragging && "bg-white opacity-80 shadow",
      )}
    >
      <td className="px-2">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex cursor-grab items-center justify-center rounded p-0.5 hover:bg-slate-100 active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-4" />
          </button>
          {field.primaryKey ? (
            <KeyRoundIcon className="size-4 text-orange-500" />
          ) : (
            <span className="size-4" />
          )}
        </div>
      </td>
      <td className="px-2">
        <div className="flex items-center gap-1">
          <Input
            type="text"
            value={field.name}
            onChange={(event) => onFieldChange({ name: event.target.value })}
            onClick={(event) => event.stopPropagation()}
            className="h-8 px-2 text-sm"
          />
        </div>
      </td>
      <td className="px-2">
        <Input
          type="text"
          value={field.logicalName}
          onChange={(event) => onFieldChange({ logicalName: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          className="h-8 px-2 text-sm"
        />
      </td>
      <td className="px-2">
        <Select
          value={field.dataType}
          onValueChange={(value) => onFieldChange({ dataType: value as SchemaFieldType })}
        >
          <SelectTrigger
            className={cn("h-8 w-full px-2 text-xs font-medium", typeStyles[field.dataType])}
            onClick={(event) => event.stopPropagation()}
          >
            <SelectValue>{schemaFieldTypeLabels[field.dataType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schemaFieldTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {schemaFieldTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2">
        {hasLength(field.dataType) ? (
          <Input
            type="number"
            value={field.length}
            onChange={(event) =>
              onFieldChange({ length: Number.parseInt(event.target.value, 10) || 0 })
            }
            onClick={(event) => event.stopPropagation()}
            className="h-8 px-2 text-sm"
          />
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td className="px-1">
        <div className="flex justify-center">
          <Checkbox
            checked={field.primaryKey}
            onCheckedChange={(checked) => onFieldChange({ primaryKey: checked === true })}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-1">
        <div className="flex justify-center">
          <Checkbox
            checked={field.nullable}
            onCheckedChange={(checked) => onFieldChange({ nullable: checked === true })}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-1">
        <div className="flex justify-center">
          <Checkbox
            checked={field.autoIncrement}
            onCheckedChange={(checked) => onFieldChange({ autoIncrement: checked === true })}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-1">
        <div className="flex justify-center">
          <Checkbox
            checked={field.index}
            onCheckedChange={(checked) => onFieldChange({ index: checked === true })}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-2">
        <DefaultValueCell field={field} onChange={onFieldChange} />
      </td>
      <td className="px-2">
        <Input
          type="text"
          value={field.description}
          onChange={(event) => onFieldChange({ description: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          className="h-8 px-2 text-sm"
        />
      </td>
      <td className="px-2 text-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFieldDelete(field.id);
          }}
          className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2Icon className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function DefaultValueCell({
  field,
  onChange,
}: {
  field: SchemaField;
  onChange: (patch: Partial<SchemaField>) => void;
}) {
  const options = defaultValueOptions(field.dataType);
  const selected = normalizeDefaultValue(field.dataType, field.defaultValue);
  const isCustom = selected === "__custom__";

  return (
    <div className="flex items-center gap-1">
      <Select
        value={selected}
        onValueChange={(value) => {
          if (value === "__null__") {
            onChange({ defaultValue: null });
          } else if (value === "__custom__") {
            onChange({ defaultValue: "" });
          } else {
            onChange({ defaultValue: value });
          }
        }}
      >
        <SelectTrigger
          className="h-8 min-w-0 flex-1 px-1 text-xs"
          onClick={(event) => event.stopPropagation()}
        >
          <SelectValue>{options.find((option) => option.value === selected)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          type="text"
          value={field.defaultValue ?? ""}
          onChange={(event) => onChange({ defaultValue: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          placeholder="值"
          className="h-8 w-16 px-1 text-xs"
        />
      )}
    </div>
  );
}

function arrayMove<T>(array: T[], from: number, to: number) {
  const next = array.slice();
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function sortableKeyboardCoordinates(event: KeyboardEvent) {
  const { code } = event;

  if (code === "ArrowDown") {
    return { x: 0, y: 1 };
  }
  if (code === "ArrowUp") {
    return { x: 0, y: -1 };
  }

  return undefined;
}

# DB Schema Designer Static Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity static interactive schema designer on the protected `/app` page.

**Architecture:** The `/app` route delegates to focused schema studio components under `apps/web/src/components/schema-studio/`. Mock schema data lives in a colocated TypeScript module and drives project selection, tree selection, editable table metadata, tabs, and the field grid. No server functions or Supabase persistence are introduced.

**Tech Stack:** TypeScript, React 19, TanStack Start file routes, Tailwind CSS, shared `@repo/ui` primitives, `lucide-react`.

---

## File Structure

- Create `apps/web/src/components/schema-studio/mock-data.ts`
  - Defines mock projects, folders, tables, fields, data types, and helper lookup functions.
- Create `apps/web/src/components/schema-studio/schema-studio-page.tsx`
  - Owns page-level local state and composes all schema studio panels.
- Create `apps/web/src/components/schema-studio/workspace-rail.tsx`
  - Renders the fixed icon rail.
- Create `apps/web/src/components/schema-studio/project-sidebar.tsx`
  - Renders project header, search input, and active project list.
- Create `apps/web/src/components/schema-studio/schema-tree.tsx`
  - Renders folder/table/field hierarchy with expand/collapse and selected table behavior.
- Create `apps/web/src/components/schema-studio/designer-header.tsx`
  - Renders global search, breadcrumbs, title, badge, and action buttons.
- Create `apps/web/src/components/schema-studio/designer-tabs.tsx`
  - Renders tab navigation and non-primary tab empty panels.
- Create `apps/web/src/components/schema-studio/table-metadata-form.tsx`
  - Renders editable table name, logical name, and description controls.
- Create `apps/web/src/components/schema-studio/field-grid.tsx`
  - Renders the dense field design grid.
- Modify `apps/web/src/routes/_auth/app/route.tsx`
  - Remove the centered card shell so `/app` can use the full viewport workspace.
- Modify `apps/web/src/routes/_auth/app/index.tsx`
  - Replace the current authenticated placeholder with `SchemaStudioPage`.

## Task 1: Mock Data And Types

**Files:**

- Create: `apps/web/src/components/schema-studio/mock-data.ts`

- [ ] **Step 1: Create mock schema data**

Create `apps/web/src/components/schema-studio/mock-data.ts` with exported data and helper functions:

```typescript
export type SchemaFieldType = "integer" | "text" | "boolean";

export type SchemaField = {
  id: string;
  name: string;
  logicalName: string;
  dataType: SchemaFieldType;
  length: number;
  primaryKey: boolean;
  notNull: boolean;
  autoIncrement: boolean;
  updated: boolean;
  description: string;
};

export type SchemaTable = {
  id: string;
  name: string;
  logicalName: string;
  description: string;
  fields: SchemaField[];
};

export type SchemaFolder = {
  id: string;
  name: string;
  count: number;
  tables: SchemaTable[];
};

export type SchemaProject = {
  id: string;
  name: string;
  count: number;
  color: string;
};

export const schemaProjects = [
  { id: "dispatch", name: "一体化调度系统", count: 4, color: "bg-blue-500" },
  { id: "environment", name: "能源环保系统", count: 5, color: "bg-orange-500" },
  { id: "quality-trace", name: "质量追溯系统", count: 3, color: "bg-emerald-500" },
  { id: "energy-manage", name: "能源管理系统", count: 2, color: "bg-amber-500" },
  { id: "schedule", name: "一体化排程系统", count: 6, color: "bg-red-500" },
  { id: "simulation", name: "能源仿真系统", count: 4, color: "bg-teal-500" },
  { id: "quality-manage", name: "质量管理系统", count: 7, color: "bg-violet-500" },
  { id: "order-design", name: "订单设计系统", count: 4, color: "bg-pink-500" },
  { id: "plan-schedule", name: "计划排程系统", count: 5, color: "bg-cyan-500" },
] satisfies SchemaProject[];

export const schemaFolders = [
  {
    id: "common",
    name: "01-公共对象定义",
    count: 2,
    tables: [
      {
        id: "app-stage-definition",
        name: "APPStageDefinition",
        logicalName: "工序操作阶段的定义",
        description: "工序操作阶段的定义",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号"),
          createField("Code", "定义编码", "text", 64, "阶段定义编码"),
          createField("Name", "中文名称", "text", 64, "中文名称"),
        ],
      },
      {
        id: "event-definition",
        name: "EventDefinition",
        logicalName: "生产事件定义表",
        description: "生产事件定义表（包括对一个工序过程的定义）",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号，使用自编码的ID号代表了特殊含义", {
            primaryKey: true,
            autoIncrement: true,
          }),
          createField("Code", "定义编码", "text", 64, "事件定义编码", { primaryKey: true }),
          createField(
            "AliasCode",
            "别名编码",
            "text",
            64,
            "别名编码，定义Code和AliasCode的双重含义，如：bof.start...",
            { primaryKey: true },
          ),
          createField("Name", "中文名称", "text", 64, "中文名称", { primaryKey: true }),
          createField("Icon", "Icon", "text", 128, "Icon", { primaryKey: true }),
          createField(
            "ShortCode",
            "简写码",
            "text",
            16,
            "简写码，用来返回给json等数据的名称，不应出现中划线以及点等字符",
            {
              primaryKey: true,
            },
          ),
          createField("MapCode", "事件编码映射", "text", 64, "映射到第三方系统", {
            primaryKey: true,
          }),
          createField(
            "IsStatic",
            "是否是静态",
            "boolean",
            1,
            "是否是静态的，系统内置的，不可删除的",
            {
              primaryKey: true,
            },
          ),
          createField(
            "IsActive",
            "是否是激活的",
            "boolean",
            1,
            "是否是静态的，系统内置的，不可删除的",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Category",
            "默认分类",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Process",
            "所属工序",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Kind",
            "事件类型",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Multiple",
            "是否是多个值",
            "boolean",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Remark",
            "备注信息",
            "text",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
          createField(
            "Rank",
            "顺序值",
            "integer",
            64,
            "默认分类，可为空，取值为： heat， ladle， slab",
            {
              primaryKey: true,
            },
          ),
        ],
      },
    ],
  },
  {
    id: "gantt",
    name: "041-甘特图",
    count: 1,
    tables: [
      {
        id: "job-item",
        name: "JobItem",
        logicalName: "全工序作业计划",
        description: "全工序作业计划",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("Code", "计划编码", "text", 64, "计划编码"),
          createField("Name", "作业名称", "text", 64, "作业名称"),
        ],
      },
    ],
  },
  {
    id: "material-analysis",
    name: "063-物料分析",
    count: 3,
    tables: [
      {
        id: "sample-record",
        name: "SampleRecord",
        logicalName: "采样记录",
        description: "采样记录",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("MaterialCode", "物料编码", "text", 64, "物料编码"),
          createField("SampleTime", "采样时间", "text", 64, "采样时间"),
        ],
      },
      {
        id: "sample-result",
        name: "SampleResult",
        logicalName: "采样结果详情记录",
        description: "采样结果详情记录",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("SampleId", "采样ID", "integer", 64, "采样ID"),
          createField("ResultValue", "结果值", "text", 64, "结果值"),
        ],
      },
      {
        id: "material-measure",
        name: "MaterialMeasure",
        logicalName: "物料的测量信息",
        description: "物料的测量信息",
        fields: [
          createField("Id", "ID", "integer", 64, "ID号", { primaryKey: true }),
          createField("MeasureCode", "测量编码", "text", 64, "测量编码"),
          createField("Value", "测量值", "text", 64, "测量值"),
        ],
      },
    ],
  },
  {
    id: "directory",
    name: "目录5",
    count: 5,
    tables: [],
  },
] satisfies SchemaFolder[];

export const initialProjectId = schemaProjects[0].id;
export const initialTableId = "event-definition";

export function findTableById(tableId: string) {
  for (const folder of schemaFolders) {
    const table = folder.tables.find((item) => item.id === tableId);
    if (table) {
      return table;
    }
  }

  return schemaFolders.flatMap((folder) => folder.tables)[0];
}

export function getTablePath(tableId: string) {
  const table = findTableById(tableId);
  const folder = schemaFolders.find((item) =>
    item.tables.some((tableItem) => tableItem.id === table.id),
  );

  return {
    projectName: schemaProjects[0].name,
    folderName: folder?.name ?? "",
    table,
  };
}

function createField(
  name: string,
  logicalName: string,
  dataType: SchemaFieldType,
  length: number,
  description: string,
  options: Partial<Pick<SchemaField, "primaryKey" | "notNull" | "autoIncrement" | "updated">> = {},
) {
  return {
    id: name.toLowerCase(),
    name,
    logicalName,
    dataType,
    length,
    primaryKey: options.primaryKey ?? false,
    notNull: options.notNull ?? false,
    autoIncrement: options.autoIncrement ?? true,
    updated: options.updated ?? true,
    description,
  };
}
```

- [ ] **Step 2: Run lint on the new data module**

Run: `pnpm lint`

Expected: PASS with no TypeScript or lint errors from `mock-data.ts`.

## Task 2: Route Shell And Page Composition

**Files:**

- Create: `apps/web/src/components/schema-studio/schema-studio-page.tsx`
- Modify: `apps/web/src/routes/_auth/app/route.tsx`
- Modify: `apps/web/src/routes/_auth/app/index.tsx`

- [ ] **Step 1: Create route-level schema studio page**

Create `apps/web/src/components/schema-studio/schema-studio-page.tsx`:

```tsx
import { useMemo, useState } from "react";

import { DesignerHeader } from "./designer-header";
import { DesignerTabs, type DesignerTabId } from "./designer-tabs";
import { FieldGrid } from "./field-grid";
import { initialProjectId, initialTableId, findTableById, getTablePath } from "./mock-data";
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
  const [tableDrafts, setTableDrafts] = useState(() => ({
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

  function updateMetadata(nextMetadata: typeof metadata) {
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
```

- [ ] **Step 2: Make the authenticated app layout full-viewport**

Replace `apps/web/src/routes/_auth/app/route.tsx` with:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
});

function AppLayout() {
  return <Outlet />;
}
```

- [ ] **Step 3: Render the schema studio page from `/app`**

Replace `apps/web/src/routes/_auth/app/index.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { SchemaStudioPage } from "#/components/schema-studio/schema-studio-page";

export const Route = createFileRoute("/_auth/app/")({
  component: SchemaStudioPage,
});
```

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: FAIL only because the referenced schema studio child components do not exist yet.

## Task 3: Navigation Panels

**Files:**

- Create: `apps/web/src/components/schema-studio/workspace-rail.tsx`
- Create: `apps/web/src/components/schema-studio/project-sidebar.tsx`
- Create: `apps/web/src/components/schema-studio/schema-tree.tsx`

- [ ] **Step 1: Create the icon rail**

Create `apps/web/src/components/schema-studio/workspace-rail.tsx` with a compact icon rail using
`BookOpenIcon`, `DatabaseIcon`, `RulerIcon`, and `SparklesIcon` from `lucide-react`.

- [ ] **Step 2: Create the project sidebar**

Create `apps/web/src/components/schema-studio/project-sidebar.tsx` with project search, active
project highlighting, and colored project icons from `schemaProjects`.

- [ ] **Step 3: Create the schema tree**

Create `apps/web/src/components/schema-studio/schema-tree.tsx` with folder/table expand state,
field children, selected table highlighting, and field-type icons.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: FAIL only because main content components are still missing.

## Task 4: Main Designer Components

**Files:**

- Create: `apps/web/src/components/schema-studio/designer-header.tsx`
- Create: `apps/web/src/components/schema-studio/designer-tabs.tsx`
- Create: `apps/web/src/components/schema-studio/table-metadata-form.tsx`
- Create: `apps/web/src/components/schema-studio/field-grid.tsx`

- [ ] **Step 1: Create the designer header**

Create `designer-header.tsx` with global search, breadcrumb, title, table badge, and version/export/save
actions using `HistoryIcon`, `UploadIcon`, and `SaveIcon`.

- [ ] **Step 2: Create the designer tabs**

Create `designer-tabs.tsx` with typed tab IDs: `design`, `description`, `relations`, `generate`,
and `changes`.

- [ ] **Step 3: Create the metadata form**

Create `table-metadata-form.tsx` with editable table name, logical name, and description controls.

- [ ] **Step 4: Create the field grid**

Create `field-grid.tsx` with dense field rows, type pills, checkboxes, and row action icons.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`

Expected: PASS.

## Task 5: Visual Verification

**Files:**

- No source edits expected unless visual/runtime issues are found.

- [ ] **Step 1: Start the web app**

Run: `pnpm dev:web`

Expected: Vite+ starts the TanStack Start web app and prints a local URL.

- [ ] **Step 2: Open `/app` in the browser**

Navigate to the printed local URL plus `/app`.

Expected: The protected schema designer loads if the local auth session is valid. If redirected to
`/login`, the route guard is working and visual inspection can proceed after signing in.

- [ ] **Step 3: Verify interactions**

Check that:

- Project selection changes the active project highlight.
- Folder and table expand/collapse works.
- Selecting another table updates the title, metadata form, and field grid.
- Switching tabs changes the visible content.
- Editing metadata updates the local UI.
- Save changes the save button state briefly.

- [ ] **Step 4: Final validation**

Run: `pnpm lint`

Expected: PASS.

# DB Schema Designer Static Prototype Design

## Goal

Build the first usable version of the database schema designer as a protected `/app`
workspace page. This version should closely follow the supplied design reference and focus on
layout fidelity and core navigation behavior. It will use front-end mock data only and will not
persist changes to Supabase.

## Scope

The prototype replaces the current `/app` placeholder content with a full-screen schema design
workspace:

- Left icon rail for primary workspace areas.
- Project panel with searchable project/system list.
- Schema tree panel with folders, tables, and fields.
- Main table designer surface with breadcrumb, title, action buttons, tabs, table metadata, and
  field grid.
- Mock data that matches the visual examples in the reference image, including Chinese labels.

Out of scope for this first version:

- Supabase persistence.
- Real schema CRUD.
- Multi-user collaboration.
- Version history implementation.
- Export implementation.
- Generated SQL or migration output.

## Information Architecture

The authenticated `/app` route becomes the schema studio workspace. It remains protected by the
existing `_auth` route guard.

The page is divided into four fixed workspace regions:

1. Global navigation rail
   - Logo at top.
   - Vertical tool icons for project/schema/tooling areas.
   - Account avatar at bottom.

2. Project panel
   - "项目" header with filter and add actions.
   - Search input.
   - Project list with colored icons and object counts.
   - Active project state.

3. Schema tree panel
   - Search input and add action.
   - Folder groups with table counts.
   - Expandable table nodes.
   - Field children with type-specific icons.
   - Active table state.

4. Table designer content
   - Top global search.
   - Breadcrumb path.
   - Table title and "数据表" badge.
   - Version history, export, and save actions.
   - Tabs: 表设计, 描述, 关系, 生成, 修改记录.
   - Table metadata form.
   - Field design grid.

## Data Model For Mock State

The page will keep mock data in front-end TypeScript structures:

- Project: id, name, count, color, active.
- Folder: id, name, count, tables.
- Table: id, name, logicalName, description, fields.
- Field: id, name, logicalName, dataType, length, primaryKey, notNull, autoIncrement, updated,
  description.

The initial active project is "一体化调度系统". The initial active table is
`EventDefinition(生产事件定义表)`.

## Interactions

The static prototype should include lightweight client-side interactions:

- Selecting a project changes the active highlight only.
- Expanding and collapsing folders and tables updates the tree.
- Selecting a table updates the main title, metadata form, and field grid from mock data.
- Switching tabs changes the active tab state. Non-table-design tabs can show compact placeholder
  panels because their real features are out of scope.
- Editing table name, logical name, and description updates local component state only.
- Save button shows temporary visual feedback, such as button text/state or a toast if the existing
  app already exposes toast infrastructure.

## Component Boundaries

Prefer a small set of focused components rather than one large route file:

- `SchemaStudioPage`: route-level composition and selected-table state.
- `WorkspaceRail`: global icon rail.
- `ProjectSidebar`: project list and project search.
- `SchemaTree`: folder/table/field tree.
- `DesignerHeader`: breadcrumb, title, and actions.
- `DesignerTabs`: tab navigation.
- `TableMetadataForm`: table name, logical name, and description fields.
- `FieldGrid`: field design table.

These components can initially live under `apps/web/src/components/schema-studio/`. If the project
later gains persistence, the mock data and mutations can be replaced without redesigning the route.

## Visual Direction

Match the reference image closely:

- Dense, work-focused UI.
- White/light background with subtle borders.
- Blue active states.
- Compact table rows.
- Icons from `lucide-react` using the `Icon` suffix import style.
- Shared `@repo/ui` primitives for inputs, buttons, and labels where they fit.
- Avoid marketing-style hero sections or large decorative cards.

The current shared button/input components are more rounded than the reference. For this workspace,
use scoped utility classes on layout elements where needed to achieve the tighter enterprise tool
look while still reusing shared primitives.

## Error Handling

Because this is a mock-data prototype, runtime error handling is minimal:

- Unknown or missing active table falls back to the first available table.
- Empty field arrays render an empty grid message.
- Search inputs are safe no-op filters where filtering is not implemented.

## Validation

Run `pnpm lint` after implementation. A production build is not required unless lint or runtime
behavior indicates a bundling issue.

For visual verification, start the dev server and inspect `/app` in the browser at desktop size.
Check that:

- The workspace uses the full viewport.
- The three left navigation regions and main content match the supplied layout.
- Table rows remain compact and readable.
- Text does not overlap at common desktop widths.
- Interactions do not throw console/runtime errors.

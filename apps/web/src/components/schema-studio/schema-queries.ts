import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SchemaField,
  SchemaFolder,
  TableMetadata,
} from "#/components/schema-studio/schema-types";
import type { ProjectMemberRole, TeamRole } from "#/components/schema-studio/schema-types";
import {
  $createCategory,
  $createColumn,
  $createProject,
  $createTable,
  $createTableVersion,
  $deleteCategory,
  $deleteColumn,
  $deleteTable,
  $fetchProjectMembers,
  $fetchProjectTree,
  $fetchProjects,
  $fetchTeamProjectsByShortCode,
  $listTableVersions,
  $moveColumnToTable,
  $moveTableToFolder,
  $removeProjectMember,
  $reorderCategories,
  $reorderColumns,
  $reorderTables,
  $saveTableAsVersion,
  $setSelectedTableVersion,
  $syncTableFromRef,
  $updateColumn,
  $updateTable,
  $upsertProjectMember,
} from "#/server/schema/functions";
import { $importProject } from "#/server/schema/import";
import {
  $createTeam,
  $createTeamInvite,
  $disbandTeam,
  $fetchMyTeams,
  $fetchTeamDetail,
  $fetchTeamMembers,
  $fetchTeamProjectAccess,
  $findUserByEmail,
  $joinTeamByInvite,
  $setProjectMembersBulk,
  $transferTeamOwnership,
  $updateTeam,
} from "#/server/team/functions";

import type { SaveTableVersionField } from "./schema-version-data";

export type ImportProjectPayload = {
  content: string;
  format: "dmj" | "sql";
  fileName: string;
};

const projectKeys = {
  all: () => ["schema-studio", "projects"] as const,
  tree: (projectId: string) => ["schema-studio", "project-tree", projectId] as const,
};

const teamProjectsKeys = {
  all: () => ["schema-studio", "team-projects"] as const,
  team: (teamShortCode: string) => ["schema-studio", "team-projects", teamShortCode] as const,
};

const teamKeys = {
  all: () => ["schema-studio", "teams"] as const,
  members: (teamId: string) => ["schema-studio", "team-members", teamId] as const,
  detail: (teamId: string) => ["schema-studio", "team-detail", teamId] as const,
  projectAccess: (teamId: string) => ["schema-studio", "team-project-access", teamId] as const,
};

const projectMemberKeys = {
  all: (projectId: string) => ["schema-studio", "project-members", projectId] as const,
};

const tableVersionKeys = {
  all: (tableId: string, projectId: string) =>
    ["schema-studio", "table-versions", tableId, projectId] as const,
};

// ---------------------------------------------------------------------------
// Optimistic reorder helpers
// ---------------------------------------------------------------------------

type OptimisticTreeContext = { previous: SchemaFolder[] | undefined };

function applyOrder<TItem extends { id: string }>(items: TItem[], orderedIds: string[]): TItem[] {
  const rank = new Map(orderedIds.map((id, index) => [id, index] as const));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

async function applyOptimisticTree(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  updater: (folders: SchemaFolder[]) => SchemaFolder[],
): Promise<OptimisticTreeContext> {
  const key = projectKeys.tree(projectId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<SchemaFolder[]>(key);
  if (previous) {
    queryClient.setQueryData<SchemaFolder[]>(key, updater(previous));
  }
  return { previous };
}

function rollbackOptimisticTree(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  context: OptimisticTreeContext | undefined,
) {
  if (context?.previous) {
    queryClient.setQueryData(projectKeys.tree(projectId), context.previous);
  }
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all(),
    queryFn: () => $fetchProjects(),
  });
}

export function useTeamProjects(teamShortCode: string) {
  return useQuery({
    queryKey: teamProjectsKeys.team(teamShortCode),
    queryFn: () => $fetchTeamProjectsByShortCode({ data: { teamShortCode } }),
    enabled: Boolean(teamShortCode),
  });
}

export function useProjectTree(projectId: string) {
  return useQuery({
    queryKey: projectKeys.tree(projectId),
    queryFn: () => $fetchProjectTree({ data: { projectId } }),
    enabled: Boolean(projectId),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; name: string; parentId?: string | null }) =>
      $createCategory({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      teamShortCode: string;
      name: string;
      description?: string;
      color?: string;
    }) => $createProject({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      queryClient.invalidateQueries({ queryKey: teamProjectsKeys.all() });
    },
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; folderId: string; metadata: TableMetadata }) =>
      $createTable({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string; field?: Partial<SchemaField> }) =>
      $createColumn({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string; metadata: TableMetadata }) =>
      $updateTable({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; columnId: string; patch: Partial<SchemaField> }) =>
      $updateColumn({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; categoryId: string }) =>
      $deleteCategory({ data: payload }),
    // Remove the folder from the cached tree immediately so the UI updates
    // without waiting on the round-trip refetch; roll back if the server fails.
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        folders.filter((folder) => folder.id !== variables.categoryId),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string }) =>
      $deleteTable({ data: payload }),
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        folders.map((folder) => {
          if (!folder.tables.some((table) => table.id === variables.tableId)) {
            return folder;
          }
          const tables = folder.tables.filter((table) => table.id !== variables.tableId);
          return { ...folder, tables, count: tables.length };
        }),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; columnId: string }) =>
      $deleteColumn({ data: payload }),
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        folders.map((folder) => ({
          ...folder,
          tables: folder.tables.map((table) =>
            table.fields.some((field) => field.id === variables.columnId)
              ? {
                  ...table,
                  fields: table.fields.filter((field) => field.id !== variables.columnId),
                }
              : table,
          ),
        })),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { background: true },
    mutationFn: (payload: { projectId: string; orderedCategoryIds: string[] }) =>
      $reorderCategories({ data: payload }),
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        applyOrder(folders, variables.orderedCategoryIds),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderTables() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { background: true },
    mutationFn: (payload: { projectId: string; folderId: string; orderedTableIds: string[] }) =>
      $reorderTables({ data: payload }),
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        folders.map((folder) =>
          folder.id === variables.folderId
            ? { ...folder, tables: applyOrder(folder.tables, variables.orderedTableIds) }
            : folder,
        ),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { background: true },
    mutationFn: (payload: { projectId: string; tableId: string; orderedColumnIds: string[] }) =>
      $reorderColumns({ data: payload }),
    onMutate: (variables) =>
      applyOptimisticTree(queryClient, variables.projectId, (folders) =>
        folders.map((folder) => ({
          ...folder,
          tables: folder.tables.map((table) =>
            table.id === variables.tableId
              ? { ...table, fields: applyOrder(table.fields, variables.orderedColumnIds) }
              : table,
          ),
        })),
      ),
    onError: (_error, variables, context) =>
      rollbackOptimisticTree(queryClient, variables.projectId, context),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useMoveTableToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string; targetFolderId: string }) =>
      $moveTableToFolder({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useMoveColumnToTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; columnId: string; targetTableId: string }) =>
      $moveColumnToTable({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useImportProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImportProjectPayload) => $importProject({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      queryClient.invalidateQueries({ queryKey: teamProjectsKeys.all() });
    },
  });
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export function useMyTeams() {
  return useQuery({
    queryKey: teamKeys.all(),
    queryFn: () => $fetchMyTeams(),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; slug?: string }) => $createTeam({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all() });
    },
  });
}

export function useCreateTeamInvite() {
  return useMutation({
    mutationFn: (payload: { teamId: string; role: Exclude<TeamRole, "owner"> }) =>
      $createTeamInvite({ data: payload }),
  });
}

export function useJoinTeamByInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { token: string }) => $joinTeamByInvite({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all() });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: () => $fetchTeamMembers({ data: { teamId } }),
    enabled: Boolean(teamId),
  });
}

export function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => $fetchTeamDetail({ data: { teamId } }),
    enabled: Boolean(teamId),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      teamId: string;
      name: string;
      icon?: string | null;
      description?: string | null;
    }) => $updateTeam({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.teamId) });
    },
  });
}

export function useTransferTeamOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { teamId: string; targetUserId: string }) =>
      $transferTeamOwnership({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.members(variables.teamId) });
    },
  });
}

export function useDisbandTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { teamId: string }) => $disbandTeam({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all() });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      queryClient.invalidateQueries({ queryKey: teamProjectsKeys.all() });
    },
  });
}

export function useTeamProjectAccess(teamId: string) {
  return useQuery({
    queryKey: teamKeys.projectAccess(teamId),
    queryFn: () => $fetchTeamProjectAccess({ data: { teamId } }),
    enabled: Boolean(teamId),
  });
}

export function useSetProjectMembersBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      teamId: string;
      changes: { projectId: string; userId: string; role: ProjectMemberRole | null }[];
    }) => $setProjectMembersBulk({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.projectAccess(variables.teamId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      const projectIds = new Set(variables.changes.map((change) => change.projectId));
      for (const projectId of projectIds) {
        queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(projectId) });
      }
    },
  });
}

export function useFindUserByEmail() {
  return useMutation({
    mutationFn: (payload: { email: string }) => $findUserByEmail({ data: payload }),
  });
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectMemberKeys.all(projectId),
    queryFn: () => $fetchProjectMembers({ data: { projectId } }),
    enabled: Boolean(projectId),
  });
}

export function useUpsertProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; userId: string; role: ProjectMemberRole }) =>
      $upsertProjectMember({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(variables.projectId) });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; userId: string }) =>
      $removeProjectMember({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

// ---------------------------------------------------------------------------
// Table versions
// ---------------------------------------------------------------------------

type VersionListItem = {
  id: string;
  shortCode: string;
  name: string;
  logicalName: string;
  description: string;
  version: number;
  versionSelected: boolean;
  createdAt: string;
};

export function useTableVersions(tableId: string, projectId: string) {
  return useQuery({
    queryKey: tableVersionKeys.all(tableId, projectId),
    queryFn: () =>
      $listTableVersions({ data: { tableId, projectId } }) as Promise<VersionListItem[]>,
    enabled: Boolean(tableId) && Boolean(projectId),
  });
}

export function useCreateTableVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string }) =>
      $createTableVersion({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({
        queryKey: tableVersionKeys.all(variables.tableId, variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useSaveTableAsVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      projectId: string;
      tableId: string;
      metadata: TableMetadata;
      fields: SaveTableVersionField[];
    }) => $saveTableAsVersion({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({
        queryKey: tableVersionKeys.all(variables.tableId, variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export function useSetSelectedTableVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string }) =>
      $setSelectedTableVersion({ data: payload }),
    // Await the tree refetch before this resolves so the navigation that runs in
    // the caller's onSuccess lands on a tree that already reflects the newly
    // selected version. Otherwise it navigates to the new short code while the
    // tree is still stale and the page only corrects on a full reload.
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      await queryClient.invalidateQueries({
        queryKey: tableVersionKeys.all(variables.tableId, variables.projectId),
      });
    },
  });
}

export function useSyncTableFromRef() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string }) =>
      $syncTableFromRef({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({
        queryKey: tableVersionKeys.all(variables.tableId, variables.projectId),
      });
    },
  });
}

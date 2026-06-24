import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaField, TableMetadata } from "#/components/schema-studio/schema-types";
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
  $fetchMyTeams,
  $fetchTeamMembers,
  $findUserByEmail,
  $joinTeamByInvite,
} from "#/server/team/functions";

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
};

const projectMemberKeys = {
  all: (projectId: string) => ["schema-studio", "project-members", projectId] as const,
};

const tableVersionKeys = {
  all: (tableId: string, projectId: string) =>
    ["schema-studio", "table-versions", tableId, projectId] as const,
};

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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; orderedCategoryIds: string[] }) =>
      $reorderCategories({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderTables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; folderId: string; orderedTableIds: string[] }) =>
      $reorderTables({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
    },
  });
}

export function useReorderColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string; orderedColumnIds: string[] }) =>
      $reorderColumns({ data: payload }),
    onSuccess: (_, variables) => {
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

export function useSetSelectedTableVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; tableId: string }) =>
      $setSelectedTableVersion({ data: payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tree(variables.projectId) });
      queryClient.invalidateQueries({
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

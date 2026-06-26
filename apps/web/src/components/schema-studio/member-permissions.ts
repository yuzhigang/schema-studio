import type { ProjectMemberRole } from "./schema-types";

/** A project-level permission, where "none" means no access (禁止访问). */
export type ProjectPermission = ProjectMemberRole | "none";

export const PERMISSION_OPTIONS: { value: ProjectPermission; label: string }[] = [
  { value: "none", label: "禁止访问" },
  { value: "viewer", label: "只读" },
  { value: "editor", label: "编辑" },
  { value: "admin", label: "管理员" },
];

export function getPermissionLabel(value: ProjectPermission): string {
  return PERMISSION_OPTIONS.find((option) => option.value === value)?.label ?? "禁止访问";
}

export const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: "团队所有者",
  admin: "团队管理员",
  editor: "团队编辑者",
  viewer: "团队成员",
};

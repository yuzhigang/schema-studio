import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  PERMISSION_OPTIONS,
  TEAM_ROLE_LABELS,
  getPermissionLabel,
  type ProjectPermission,
} from "./member-permissions";
import {
  useDisbandTeam,
  useSetProjectMembersBulk,
  useTeamDetail,
  useTeamProjectAccess,
  useTransferTeamOwnership,
  useUpdateTeam,
} from "./schema-queries";
import type { ProjectMemberRole, TeamRole } from "./schema-types";

type TeamSettingsTab = "basic" | "members";

export function TeamSettingsDialog({
  open,
  onOpenChange,
  teamId,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<TeamSettingsTab>("basic");
  const { data: detail } = useTeamDetail(teamId);
  const role = detail?.role ?? "viewer";
  const canManage = role === "owner" || role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-h-[680px] w-[92vw] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>团队设置</DialogTitle>
          <DialogDescription className="truncate">{detail?.name}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav className="w-44 shrink-0 border-r border-slate-200 p-2">
            {(
              [
                { id: "basic", label: "基本设置" },
                { id: "members", label: "成员管理" },
              ] as { id: TeamSettingsTab; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  tab === item.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-auto p-6">
            {tab === "basic" ? (
              <BasicSettingsPanel
                teamId={teamId}
                currentUserId={currentUserId}
                canManage={canManage}
                role={role}
                onDisbanded={() => onOpenChange(false)}
              />
            ) : (
              <MembersListPanel teamId={teamId} canManage={canManage} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BasicSettingsPanel({
  teamId,
  currentUserId,
  canManage,
  role,
  onDisbanded,
}: {
  teamId: string;
  currentUserId: string;
  canManage: boolean;
  role: TeamRole;
  onDisbanded: () => void;
}) {
  const navigate = useNavigate();
  const { data: detail, error: detailError } = useTeamDetail(teamId);
  const { data: access } = useTeamProjectAccess(teamId);
  const updateTeam = useUpdateTeam();
  const transferOwnership = useTransferTeamOwnership();
  const disbandTeam = useDisbandTeam();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbandText, setDisbandText] = useState("");

  // Seed the form once the detail loads; keep editing thereafter.
  useEffect(() => {
    if (detail) {
      setName(detail.name);
      setIcon(detail.icon ?? "");
      setDescription(detail.description ?? "");
    }
  }, [detail]);

  const isOwner = role === "owner";
  const transferableMembers = useMemo(
    () => (access?.members ?? []).filter((member) => member.userId !== currentUserId),
    [access, currentUserId],
  );

  function handleSave() {
    if (!name.trim()) return;
    updateTeam.mutate({
      teamId,
      name: name.trim(),
      icon: icon.trim() || null,
      description: description.trim() || null,
    });
  }

  function handleTransfer() {
    if (!transferTarget) return;
    transferOwnership.mutate(
      { teamId, targetUserId: transferTarget },
      { onSuccess: () => setTransferTarget("") },
    );
  }

  function handleDisband() {
    disbandTeam.mutate(
      { teamId },
      {
        onSuccess: () => {
          onDisbanded();
          void navigate({ to: "/team" });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {detailError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          无法加载团队信息，基本设置暂时不可编辑。如刚部署，请确认数据库已包含 team.icon /
          team.description 字段。
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">团队名称</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!canManage}
            placeholder="团队名称"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">图标</label>
          <Input
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            disabled={!canManage}
            placeholder="可填入一个 Emoji，如 🚀"
            maxLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">描述</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canManage}
            rows={3}
            placeholder="团队描述（可选）"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-none outline-none focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        {canManage && (
          <div className="flex items-center justify-end gap-3">
            {updateTeam.isError && (
              <span className="text-xs text-red-600">保存失败，请稍后重试。</span>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || updateTeam.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存
            </Button>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="space-y-4 rounded-md border border-red-200 bg-red-50/40 p-4">
          <h3 className="text-sm font-semibold text-red-700">危险操作</h3>

          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              移交团队：将「团队所有者」转交给其他成员，你将降级为管理员。
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={transferTarget}
                onValueChange={(value) => setTransferTarget(value ?? "")}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="选择新的所有者" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {transferableMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.displayName ?? member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleTransfer}
                disabled={!transferTarget || transferOwnership.isPending}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                移交
              </Button>
            </div>
          </div>

          <div className="space-y-2 border-t border-red-200 pt-3">
            <p className="text-sm text-slate-700">
              解散团队：团队及其访问关系将被移除，此操作不可恢复。
            </p>
            {confirmDisband ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  请输入团队名称 <span className="font-medium text-slate-700">{detail?.name}</span>{" "}
                  以确认。
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={disbandText}
                    onChange={(event) => setDisbandText(event.target.value)}
                    placeholder="输入团队名称"
                    className="w-64"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisband}
                    disabled={disbandText !== detail?.name || disbandTeam.isPending}
                    className="border-red-400 bg-red-600 text-white hover:bg-red-700"
                  >
                    确认解散
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setConfirmDisband(false);
                      setDisbandText("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDisband(true)}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                解散团队
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type TeamProjectAccessMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: TeamRole;
};

type TeamProjectAccessProject = {
  id: string;
  name: string;
  shortCode: string;
  color: string | null;
};

type TeamProjectAccessRow = {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
};

function MembersListPanel({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const { data: access, isLoading } = useTeamProjectAccess(teamId);
  const [activeMember, setActiveMember] = useState<TeamProjectAccessMember | null>(null);

  const members = (access?.members ?? []) as TeamProjectAccessMember[];
  const projects = (access?.projects ?? []) as TeamProjectAccessProject[];
  const accessRows = (access?.access ?? []) as TeamProjectAccessRow[];

  // Count how many projects each member is explicitly granted access to.
  const grantedCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of accessRows) {
      map.set(row.userId, (map.get(row.userId) ?? 0) + 1);
    }
    return map;
  }, [accessRows]);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-slate-400">加载中…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        查看团队成员，并为某个成员设置其可访问的项目与权限。团队所有者 /
        管理员默认拥有全部项目权限。
      </p>

      <div className="overflow-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">成员</th>
              <th className="px-4 py-3 font-medium">团队角色</th>
              <th className="px-4 py-3 font-medium">可访问项目</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => {
              const isInheritedAdmin = member.role === "owner" || member.role === "admin";
              const grantedCount = grantedCountByUser.get(member.userId) ?? 0;
              return (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                        {(member.displayName ?? member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate">{member.displayName ?? member.email}</div>
                        <div className="truncate text-xs text-slate-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                      {TEAM_ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {isInheritedAdmin ? (
                      <span
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500"
                        title="团队所有者 / 管理员默认拥有全部项目的访问权限"
                      >
                        全部（继承）
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        已授权 {grantedCount} / {projects.length}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isInheritedAdmin ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveMember(member)}
                      >
                        项目
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeMember && (
        <MemberProjectsDialog
          teamId={teamId}
          member={activeMember}
          projects={projects}
          accessRows={accessRows}
          canManage={canManage}
          open={activeMember !== null}
          onOpenChange={(next) => {
            if (!next) setActiveMember(null);
          }}
        />
      )}
    </div>
  );
}

function MemberProjectsDialog({
  teamId,
  member,
  projects,
  accessRows,
  canManage,
  open,
  onOpenChange,
}: {
  teamId: string;
  member: TeamProjectAccessMember;
  projects: TeamProjectAccessProject[];
  accessRows: TeamProjectAccessRow[];
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setBulk = useSetProjectMembersBulk();

  // This member's currently-saved permission per project.
  const savedByProject = useMemo(() => {
    const map = new Map<string, ProjectMemberRole>();
    for (const row of accessRows) {
      if (row.userId === member.userId) {
        map.set(row.projectId, row.role);
      }
    }
    return map;
  }, [accessRows, member.userId]);

  // Pending edits keyed by projectId → new permission. Reset when data changes.
  const [edits, setEdits] = useState<Map<string, ProjectPermission>>(new Map());
  useEffect(() => {
    setEdits(new Map());
  }, [member.userId, accessRows]);

  function currentValue(projectId: string): ProjectPermission {
    if (edits.has(projectId)) {
      return edits.get(projectId) as ProjectPermission;
    }
    return savedByProject.get(projectId) ?? "none";
  }

  function handleChange(projectId: string, next: ProjectPermission) {
    const saved = savedByProject.get(projectId) ?? "none";
    setEdits((prev) => {
      const map = new Map(prev);
      if (next === saved) {
        // Reverting to the saved value drops the pending edit.
        map.delete(projectId);
      } else {
        map.set(projectId, next);
      }
      return map;
    });
  }

  function handleSave() {
    const changes = Array.from(edits.entries()).map(([projectId, permission]) => ({
      projectId,
      userId: member.userId,
      role: permission === "none" ? null : (permission as ProjectMemberRole),
    }));
    if (changes.length === 0) return;
    setBulk.mutate(
      { teamId, changes },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[90vw] max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle>设置项目权限</DialogTitle>
          <DialogDescription className="truncate">
            {member.displayName ?? member.email}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {projects.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              该团队暂无项目
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">项目</th>
                    <th className="px-4 py-3 font-medium">权限</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((project) => {
                    const value = currentValue(project.id);
                    return (
                      <tr key={project.id}>
                        <td className="px-4 py-3">
                          <span className="truncate">{project.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={value}
                            onValueChange={(next) =>
                              handleChange(project.id, (next ?? "none") as ProjectPermission)
                            }
                            disabled={!canManage || setBulk.isPending}
                          >
                            <SelectTrigger
                              className={cn("w-32", value === "none" && "text-slate-400")}
                            >
                              <SelectValue>
                                {(raw) => getPermissionLabel(raw as ProjectPermission)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {PERMISSION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          {setBulk.isError && (
            <span className="mr-auto self-center text-xs text-red-600">保存失败，请稍后重试。</span>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {canManage && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={edits.size === 0 || setBulk.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存{edits.size > 0 ? `（${edits.size}）` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { LayersIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState, type PointerEvent } from "react";

import {
  PERMISSION_OPTIONS,
  TEAM_ROLE_LABELS,
  getPermissionLabel,
  type ProjectPermission,
} from "./member-permissions";
import { ProjectSidebar } from "./project-sidebar";
import {
  useProjectMembers,
  useRemoveProjectMember,
  useTeamMembers,
  useTeamProjects,
  useUpsertProjectMember,
} from "./schema-queries";
import type { ProjectMemberRole } from "./schema-types";
import { useProjectPanelWidth } from "./use-panel-width";
import { WorkspaceRail } from "./workspace-rail";

type NavSection = {
  title: string;
  items: { id: string; label: string }[];
};

const settingsSections: NavSection[] = [
  {
    title: "通用设置",
    items: [
      { id: "basic", label: "基本设置" },
      { id: "members", label: "成员管理" },
      { id: "response", label: "响应校验设置" },
      { id: "ai", label: "AI功能设置" },
      { id: "mock", label: "Mock设置" },
      { id: "advanced", label: "高级设置" },
    ],
  },
  {
    title: "项目资源",
    items: [
      { id: "common-fields", label: "常用字段" },
      { id: "iteration-branches", label: "迭代分支" },
      { id: "common-branches", label: "通用分支" },
      { id: "script-library", label: "脚本库" },
      { id: "db-connection", label: "数据库连接" },
      { id: "git-connection", label: "Git仓库连接" },
    ],
  },
  {
    title: "数据管理",
    items: [
      { id: "data-source", label: "绑定数据源" },
      { id: "import", label: "导入数据" },
      { id: "export", label: "导出数据" },
    ],
  },
];

function getSectionLabel(id: string) {
  for (const section of settingsSections) {
    const item = section.items.find((item) => item.id === id);
    if (item) {
      return item.label;
    }
  }
  return "";
}

type ResizeState = {
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
};

export function ProjectSettingsPage({
  teamShortCode,
  projectShortCode,
}: {
  teamShortCode: string;
  projectShortCode: string;
}) {
  const navigate = useNavigate();
  const { data: projects = [] } = useTeamProjects(teamShortCode);
  const activeProject = useMemo(
    () => projects.find((project) => project.shortCode === projectShortCode),
    [projects, projectShortCode],
  );

  const [activeSection, setActiveSection] = useState("members");
  const {
    width: projectPanelWidth,
    setWidth: setProjectPanelWidth,
    minWidth: projectPanelMinWidth,
    maxWidth: projectPanelMaxWidth,
  } = useProjectPanelWidth();
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  useEffect(() => {
    if (!resizeState) {
      return;
    }

    const currentResize = resizeState;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(event: globalThis.PointerEvent) {
      const nextWidth = clamp(
        currentResize.startWidth + event.clientX - currentResize.startX,
        currentResize.minWidth,
        currentResize.maxWidth,
      );
      setProjectPanelWidth(nextWidth);
    }

    function handlePointerUp() {
      setResizeState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizeState, setProjectPanelWidth]);

  function startResize(startWidth: number, minWidth: number, maxWidth: number) {
    return (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setResizeState({
        startX: event.clientX,
        startWidth,
        minWidth,
        maxWidth,
      });
    };
  }

  return (
    <div className="flex h-svh min-w-[1180px] flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
            <LayersIcon className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">数据库设计平台</h1>
        </div>
        <div className="relative w-[560px] max-w-[42vw]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索项目、表、字段、注释..."
            className="h-10 rounded-md border-slate-200 bg-white pl-9 shadow-none"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceRail activeTeamShortCode={teamShortCode} />

        <div className="h-full shrink-0" style={{ width: projectPanelWidth }}>
          <ProjectSidebar
            teamShortCode={teamShortCode}
            activeProjectShortCode={projectShortCode}
            onProjectChange={(shortCode) => {
              void navigate({
                to: "/team/$teamShortCode/project/$projectShortCode",
                params: { teamShortCode, projectShortCode: shortCode },
              });
            }}
          />
        </div>

        <ResizeDivider
          label="调整项目列表宽度"
          active={resizeState !== null}
          onPointerDown={startResize(projectPanelWidth, projectPanelMinWidth, projectPanelMaxWidth)}
        />

        <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">项目设置</h2>
            <p className="truncate text-xs text-slate-500">{activeProject?.name}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
            {settingsSections.map((section) => (
              <div key={section.title} className="mb-4">
                <h3 className="px-3 py-2 text-xs font-medium text-slate-400">{section.title}</h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        activeSection === item.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h1 className="text-xl font-semibold text-slate-950">
              {getSectionLabel(activeSection)}
            </h1>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
            {activeSection === "members" ? (
              <ProjectMembersPanel
                projectId={activeProject?.id ?? ""}
                teamId={activeProject?.teamId ?? ""}
              />
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                该模块尚未实现
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProjectMembersPanel({ projectId, teamId }: { projectId: string; teamId: string }) {
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers(teamId);
  const { data: projectMembers = [] } = useProjectMembers(projectId);
  const upsertMember = useUpsertProjectMember();
  const removeMember = useRemoveProjectMember();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Map each user to their explicit project_member role (absent = no access).
  const roleByUserId = useMemo(() => {
    const map = new Map<string, ProjectMemberRole>();
    for (const member of projectMembers) {
      map.set(member.userId, member.role);
    }
    return map;
  }, [projectMembers]);

  const grantedCount = useMemo(
    () =>
      teamMembers.filter(
        (member) =>
          member.role === "owner" || member.role === "admin" || roleByUserId.has(member.userId),
      ).length,
    [teamMembers, roleByUserId],
  );

  function handlePermissionChange(userId: string, next: ProjectPermission) {
    if (!projectId) return;
    setPendingUserId(userId);
    const onSettled = () => setPendingUserId((current) => (current === userId ? null : current));
    if (next === "none") {
      // Revoking access soft-deletes the project_member row.
      removeMember.mutate({ projectId, userId }, { onSettled });
    } else {
      // Granting any role creates/updates the project_member row, which is what
      // "joining the project" means here.
      upsertMember.mutate({ projectId, userId, role: next }, { onSettled });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          团队成员（{teamMembers.length}）· 已授权 {grantedCount}
        </p>
      </div>

      <div className="rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">团队角色</th>
              <th className="px-4 py-3 font-medium">项目权限</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  {teamLoading ? "加载中…" : "暂无团队成员"}
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => {
                const isInheritedAdmin = member.role === "owner" || member.role === "admin";
                const currentPermission: ProjectPermission =
                  roleByUserId.get(member.userId) ?? "none";
                const isPending = pendingUserId === member.userId;
                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                          {(member.displayName ?? member.email).charAt(0).toUpperCase()}
                        </div>
                        <span>{member.displayName ?? member.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                        {TEAM_ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isInheritedAdmin ? (
                        <span
                          className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500"
                          title="团队所有者 / 管理员默认拥有项目的完整访问权限"
                        >
                          管理员（继承）
                        </span>
                      ) : (
                        <Select
                          value={currentPermission}
                          onValueChange={(value) =>
                            handlePermissionChange(
                              member.userId,
                              (value ?? "none") as ProjectPermission,
                            )
                          }
                          disabled={isPending || !projectId}
                        >
                          <SelectTrigger
                            className={cn("w-32", currentPermission === "none" && "text-slate-400")}
                          >
                            <SelectValue>
                              {(value) => getPermissionLabel(value as ProjectPermission)}
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
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResizeDivider({
  label,
  active,
  onPointerDown,
}: {
  label: string;
  active: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative w-2 shrink-0 cursor-col-resize bg-white transition-colors outline-none hover:bg-blue-50 focus-visible:bg-blue-50",
        active && "bg-blue-50",
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-slate-200 transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500",
          active && "bg-blue-500",
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          active && "bg-blue-500 opacity-100",
        )}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

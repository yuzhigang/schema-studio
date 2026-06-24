import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  CopyIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useCreateProject, useMyTeams, useTeamProjects } from "./schema-queries";
import type { SchemaProject } from "./schema-types";

type ProjectSidebarProps = {
  teamShortCode: string;
  activeProjectShortCode?: string;
  onProjectChange: (projectShortCode: string) => void;
  onImportFile?: (file: File) => void;
};

export function ProjectSidebar({
  teamShortCode,
  activeProjectShortCode,
  onProjectChange,
  onImportFile,
}: ProjectSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const { data: projects = [], isLoading } = useTeamProjects(teamShortCode);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const createProject = useCreateProject();
  const { data: teams = [] } = useMyTeams();
  const currentTeam = teams.find((team) => team.shortCode === teamShortCode);
  const canCreateProject =
    currentTeam?.role === "owner" ||
    currentTeam?.role === "admin" ||
    currentTeam?.role === "editor";

  function handleCreateProject(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { teamShortCode, name: newProjectName.trim() },
      {
        onSuccess: ({ shortCode }) => {
          setNewProjectName("");
          setCreateOpen(false);
          onProjectChange(shortCode);
        },
      },
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white">
      <div className="flex h-[58px] items-center justify-between px-3">
        <h2 className="text-sm font-semibold text-slate-900">项目</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="导入项目"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="筛选项目"
          >
            <FilterIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-md text-slate-600"
            aria-label="新增项目"
            disabled={!canCreateProject}
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dmj,.sql"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImportFile?.(file);
              }
              if (event.target) {
                event.target.value = "";
              }
            }}
          />
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 rounded-md border-slate-200 bg-white pl-9 text-sm shadow-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        {isLoading ? (
          <div className="px-2 py-4 text-center text-sm text-slate-400">加载中…</div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-slate-400">暂无项目</div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              teamShortCode={teamShortCode}
              isActive={project.shortCode === activeProjectShortCode}
              isTeamAdmin={currentTeam?.role === "owner" || currentTeam?.role === "admin"}
              onClick={() => onProjectChange(project.shortCode)}
            />
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>新建项目</DialogTitle>
              <DialogDescription>项目将归属于当前团队。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="项目名称"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!newProjectName.trim() || createProject.isPending}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ProjectListItem({
  project,
  teamShortCode,
  isActive,
  isTeamAdmin,
  onClick,
}: {
  project: SchemaProject;
  teamShortCode: string;
  isActive: boolean;
  isTeamAdmin: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex h-9 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-slate-100",
        isActive && "bg-blue-50 text-blue-700 hover:bg-blue-50",
        !isActive && "text-slate-700",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-[3px] text-white",
            project.color,
          )}
        >
          <span className="size-1.5 rounded-full bg-white" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="truncate">{project.name}</span>
          <span className="shrink-0 text-slate-500">({project.count})</span>
        </div>
      </button>
      {isTeamAdmin && <ProjectActionsMenu teamShortCode={teamShortCode} project={project} />}
    </div>
  );
}

function ProjectActionsMenu({
  teamShortCode,
  project,
}: {
  teamShortCode: string;
  project: SchemaProject;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="shrink-0 rounded-md text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-700 focus:opacity-100"
            aria-label="更多选项"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" side="right">
        <DropdownMenuItem
          onClick={() => {
            void navigate({
              to: "/team/$teamShortCode/project/$projectShortCode/settings",
              params: { teamShortCode, projectShortCode: project.shortCode },
            });
          }}
        >
          <SettingsIcon className="mr-2 size-4" />
          设置
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.alert("新建项目功能开发中")}>
          <PlusIcon className="mr-2 size-4" />
          新建
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.alert("复制项目功能开发中")}>
          <CopyIcon className="mr-2 size-4" />
          复制
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => window.alert("删除项目功能开发中")}>
          <Trash2Icon className="mr-2 size-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

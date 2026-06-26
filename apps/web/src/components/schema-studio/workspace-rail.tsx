import { $signOut } from "@repo/auth/tanstack/functions";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  BookOpenIcon,
  Building2Icon,
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  LinkIcon,
  LogOutIcon,
  PlusIcon,
  RulerIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

import { useCreateTeam, useCreateTeamInvite, useMyTeams } from "./schema-queries";
import { TeamSettingsDialog } from "./team-settings-dialog";

const railItems = [
  { id: "schemas", label: "Schema", icon: BookOpenIcon, active: true },
  { id: "database", label: "Database", icon: DatabaseIcon, active: false },
  { id: "rules", label: "Rules", icon: RulerIcon, active: false },
  { id: "tools", label: "Tools", icon: SparklesIcon, active: false },
];

const INVITE_ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  editor: "编辑者",
  viewer: "只读",
};

const INVITE_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "可管理团队成员、项目及团队设置，但不能移交或解散团队。",
  editor: "可创建并编辑被授权项目的表、字段等内容。",
  viewer: "仅可查看被授权的项目，不能修改任何内容。",
};

export function WorkspaceRail({ activeTeamShortCode }: { activeTeamShortCode?: string }) {
  return (
    <aside className="flex w-[52px] shrink-0 flex-col items-center border-r border-slate-200 bg-white">
      <nav className="flex w-full flex-1 flex-col items-center gap-3 py-4">
        {railItems.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="icon-sm"
            variant={item.active ? "default" : "ghost"}
            className={
              item.active
                ? "rounded-md bg-blue-600 shadow-none hover:bg-blue-700"
                : "rounded-md text-slate-700"
            }
            aria-label={item.label}
          >
            <item.icon className="size-5" />
          </Button>
        ))}
      </nav>
      <div className="flex flex-col items-center gap-3 pb-4">
        <TeamSettingsLauncher activeTeamShortCode={activeTeamShortCode} />
        <TeamMenu activeTeamShortCode={activeTeamShortCode} />
      </div>
    </aside>
  );
}

function TeamSettingsLauncher({ activeTeamShortCode }: { activeTeamShortCode?: string }) {
  const { data: user } = useQuery(authQueryOptions());
  const { data: teams = [] } = useMyTeams();
  const [open, setOpen] = useState(false);

  const currentTeam = teams.find((team) => team.shortCode === activeTeamShortCode);

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="rounded-md text-slate-700"
        aria-label="团队设置"
        disabled={!currentTeam}
        onClick={() => setOpen(true)}
      >
        <Building2Icon className="size-5" />
      </Button>
      {currentTeam && user?.id && (
        <TeamSettingsDialog
          open={open}
          onOpenChange={setOpen}
          teamId={currentTeam.id}
          currentUserId={user.id}
        />
      )}
    </>
  );
}

function TeamMenu({ activeTeamShortCode }: { activeTeamShortCode?: string }) {
  const { data: user } = useQuery(authQueryOptions());
  const { data: teams = [] } = useMyTeams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "invite">("create");
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const createTeam = useCreateTeam();
  const createInvite = useCreateTeamInvite();

  const displayName = user?.email ?? "U";
  const initial = displayName.charAt(0).toUpperCase();

  function openCreate() {
    setDialogMode("create");
    setTeamName("");
    setInviteLink("");
    setCopied(false);
    setDialogOpen(true);
  }

  function openInvite() {
    setDialogMode("invite");
    setSelectedTeamId("");
    setInviteLink("");
    setCopied(false);
    setDialogOpen(true);
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    await $signOut();
    queryClient.setQueryData(authQueryOptions().queryKey, null);
    await router.invalidate();
  }

  function handleCreateTeam(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!teamName.trim()) return;
    createTeam.mutate(
      { name: teamName.trim() },
      {
        onSuccess: () => {
          setTeamName("");
          setDialogOpen(false);
        },
      },
    );
  }

  function handleCreateInvite(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!selectedTeamId) return;
    createInvite.mutate(
      { teamId: selectedTeamId, role: inviteRole },
      {
        onSuccess: (token) => {
          setInviteLink(`${window.location.origin}/invite/${token}`);
        },
      },
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
              aria-label="团队菜单"
            >
              {initial}
            </Button>
          }
        />
        <DropdownMenuContent align="end" side="right" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{teams.length} 个团队</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                className="text-sm"
                onClick={() => {
                  void navigate({
                    to: "/team/$teamShortCode",
                    params: { teamShortCode: team.shortCode },
                  });
                }}
              >
                <span
                  className={cn(
                    "truncate",
                    team.shortCode === activeTeamShortCode && "font-semibold",
                  )}
                >
                  {team.name}
                </span>
                <span className="ml-auto text-xs text-slate-400">{team.role}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                openCreate();
              }}
            >
              <PlusIcon className="mr-2 size-4" />
              新建团队
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openInvite();
              }}
            >
              <UserIcon className="mr-2 size-4" />
              邀请成员
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOutIcon className="mr-2 size-4" />
              登出
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-lg">
        {dialogMode === "create" ? (
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle>新建团队</DialogTitle>
              <DialogDescription>创建后你将成为团队所有者。</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="团队名称"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!teamName.trim() || createTeam.isPending}>
                创建
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleCreateInvite}>
            <DialogHeader>
              <DialogTitle>邀请成员</DialogTitle>
              <DialogDescription>
                选择团队与角色后生成一个邀请链接，发给同事打开即可加入。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700">
                  <span className="mr-1 text-slate-400">①</span>邀请到团队
                </div>
                <Select
                  value={selectedTeamId}
                  onValueChange={(value) => setSelectedTeamId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择团队">
                      {(value) => teams.find((team) => team.id === value)?.name ?? "选择团队"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((team) => team.role === "owner" || team.role === "admin")
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">仅显示你作为所有者 / 管理员的团队。</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700">
                  <span className="mr-1 text-slate-400">②</span>成员角色
                </div>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole((value ?? "editor") as typeof inviteRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择角色">
                      {(value) => INVITE_ROLE_LABELS[value as string] ?? "选择角色"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="editor">编辑者</SelectItem>
                    <SelectItem value="viewer">只读</SelectItem>
                  </SelectContent>
                </Select>
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {INVITE_ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700">
                  <span className="mr-1 text-slate-400">③</span>邀请链接
                </div>
                {inviteLink ? (
                  <>
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                      <LinkIcon className="size-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1 text-xs break-all text-slate-700">
                        {inviteLink}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={copied ? "outline" : "default"}
                        className="shrink-0 gap-1"
                        onClick={copyInviteLink}
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="size-3.5" />
                            已复制
                          </>
                        ) : (
                          <>
                            <CopyIcon className="size-3.5" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-600">
                      链接 1 小时内有效，且仅可使用一次，请尽快发送。
                    </p>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                    点击下方「生成链接」后，邀请链接会显示在这里。
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                关闭
              </Button>
              <Button type="submit" disabled={!selectedTeamId || createInvite.isPending}>
                {inviteLink ? "重新生成" : "生成链接"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

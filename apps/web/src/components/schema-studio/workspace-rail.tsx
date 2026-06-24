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
  CopyIcon,
  DatabaseIcon,
  LogOutIcon,
  PlusIcon,
  RulerIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

import { useCreateTeam, useCreateTeamInvite, useMyTeams } from "./schema-queries";

const railItems = [
  { id: "schemas", label: "Schema", icon: BookOpenIcon, active: true },
  { id: "database", label: "Database", icon: DatabaseIcon, active: false },
  { id: "rules", label: "Rules", icon: RulerIcon, active: false },
  { id: "tools", label: "Tools", icon: SparklesIcon, active: false },
];

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
      <div className="pb-4">
        <TeamMenu activeTeamShortCode={activeTeamShortCode} />
      </div>
    </aside>
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

      <DialogContent>
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
              <DialogDescription>生成 1 小时有效的邀请链接。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                value={selectedTeamId}
                onValueChange={(value) => setSelectedTeamId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择团队" />
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
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole((value ?? "editor") as typeof inviteRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="editor">编辑者</SelectItem>
                  <SelectItem value="viewer">只读</SelectItem>
                </SelectContent>
              </Select>
              {inviteLink && (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <div className="min-w-0 flex-1 text-xs break-all text-slate-700">
                    {inviteLink}
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="shrink-0 text-slate-600 hover:text-slate-900"
                    aria-label="复制邀请链接"
                    onClick={copyInviteLink}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
              )}
              {copied && <p className="text-xs text-green-600">已复制到剪贴板</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                关闭
              </Button>
              <Button type="submit" disabled={!selectedTeamId || createInvite.isPending}>
                生成链接
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

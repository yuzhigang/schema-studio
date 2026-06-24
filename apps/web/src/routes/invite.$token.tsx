import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { useJoinTeamByInvite } from "#/components/schema-studio/schema-queries";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const joinInvite = useJoinTeamByInvite();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("正在加入团队…");

  useEffect(() => {
    joinInvite.mutate(
      { token },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["auth"] });
          await queryClient.invalidateQueries({ queryKey: ["schema-studio", "teams"] });
          await queryClient.invalidateQueries({ queryKey: ["schema-studio", "projects"] });
          setStatus("success");
          setMessage("加入成功，正在跳转…");
          window.setTimeout(() => {
            navigate({ to: "/team", replace: true });
          }, 800);
        },
        onError: (error) => {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "加入失败");
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900">
      {status === "loading" && <Loader2Icon className="size-8 animate-spin text-blue-600" />}
      <p className="text-sm font-medium">{message}</p>
      {status === "error" && (
        <button
          type="button"
          onClick={() => navigate({ to: "/team" })}
          className="text-sm text-blue-600 hover:underline"
        >
          返回首页
        </button>
      )}
    </div>
  );
}

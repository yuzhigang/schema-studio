import { $exchangeCodeForSession } from "@repo/auth/tanstack/functions";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/team";

    if (!code) {
      navigate({ to: "/login", replace: true });
      return;
    }

    $exchangeCodeForSession({ data: { code } })
      .then(({ user }) => {
        queryClient.setQueryData(authQueryOptions().queryKey, user);
        navigate({ to: next, replace: true });
      })
      .catch(() => {
        navigate({ to: "/login", replace: true });
      });
  }, [navigate, queryClient]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-muted-foreground">Processing login...</p>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabaseBrowser } from "#/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/app";

    if (code) {
      supabaseBrowser.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          navigate({ to: next, replace: true });
        } else {
          navigate({ to: "/login", replace: true });
        }
      });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-muted-foreground">Processing login...</p>
    </div>
  );
}

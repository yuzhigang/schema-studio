import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DatabaseZapIcon, HomeIcon } from "lucide-react";

import { SignOutButton } from "#/components/sign-out-button";
import { ThemeToggle } from "#/components/theme-toggle";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/app" className="flex items-center gap-2 text-sm font-semibold">
            <DatabaseZapIcon className="size-4" />
            <span>Schema Studio</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button render={<Link to="/" />} size="icon-sm" variant="ghost" nativeButton={false}>
              <HomeIcon className="size-4" />
              <span className="sr-only">Home</span>
            </Button>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Review schema structure, auth context, and planned model changes.
          </p>
        </div>

        <div className="rounded-md border bg-card p-4 text-card-foreground">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

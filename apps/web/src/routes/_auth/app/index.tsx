import { useAuthSuspense } from "@repo/auth/tanstack/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app/")({
  component: AppIndex,
});

function AppIndex() {
  const { user } = useAuthSuspense();
  const displayName = user?.user_metadata?.name || user?.email || "Authenticated user";

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <section className="rounded-md border bg-background p-4">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <h2 className="mt-1 text-lg font-semibold">{displayName}</h2>
      </section>
      <section className="rounded-md border bg-background p-4">
        <p className="text-sm text-muted-foreground">Current area</p>
        <h2 className="mt-1 text-lg font-semibold">Protected workspace</h2>
      </section>
    </div>
  );
}

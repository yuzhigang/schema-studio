import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  DatabaseZapIcon,
  GitBranchIcon,
  LockKeyholeIcon,
  TablePropertiesIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-8 lg:py-14">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <DatabaseZapIcon className="size-5" />
              <span>Schema Studio</span>
            </Link>
            <Button render={<Link to="/app" />} nativeButton={false} size="sm">
              Open Studio
              <ArrowRightIcon className="size-4" />
            </Button>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-2xl space-y-5">
              <p className="text-sm font-medium text-muted-foreground">Schema design workspace</p>
              <h1 className="text-4xl font-semibold tracking-normal md:text-5xl">
                Model application data without losing the shape of the system.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Keep schema decisions, access boundaries, and integration notes in one place while
                the product is still changing.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button render={<Link to="/app" />} nativeButton={false}>
                  Go to workspace
                  <ArrowRightIcon className="size-4" />
                </Button>
                <Button render={<Link to="/login" />} nativeButton={false} variant="outline">
                  Sign in
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: <TablePropertiesIcon className="size-4" />,
                  label: "Schema inventory",
                  text: "Track entities, fields, and ownership decisions.",
                },
                {
                  icon: <GitBranchIcon className="size-4" />,
                  label: "Change planning",
                  text: "Compare model changes before they reach migrations.",
                },
                {
                  icon: <LockKeyholeIcon className="size-4" />,
                  label: "Access context",
                  text: "Keep auth and data boundaries visible with the schema.",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-md border bg-card p-4 text-card-foreground"
                >
                  <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-muted">
                    {item.icon}
                  </div>
                  <h2 className="text-sm font-semibold">{item.label}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

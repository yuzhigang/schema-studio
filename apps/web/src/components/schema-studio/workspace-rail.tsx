import { Button } from "@repo/ui/components/button";
import { BookOpenIcon, DatabaseIcon, RulerIcon, SparklesIcon } from "lucide-react";

const railItems = [
  { id: "schemas", label: "Schema", icon: BookOpenIcon, active: true },
  { id: "database", label: "Database", icon: DatabaseIcon, active: false },
  { id: "rules", label: "Rules", icon: RulerIcon, active: false },
  { id: "tools", label: "Tools", icon: SparklesIcon, active: false },
];

export function WorkspaceRail() {
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
        <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          A
        </div>
      </div>
    </aside>
  );
}

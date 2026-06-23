import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { FilterIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { schemaProjects } from "./mock-data";

type ProjectSidebarProps = {
  activeProjectId: string;
  onProjectChange: (projectId: string) => void;
};

export function ProjectSidebar({ activeProjectId, onProjectChange }: ProjectSidebarProps) {
  const [query, setQuery] = useState("");
  const projects = schemaProjects.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[58px] items-center justify-between px-3">
        <h2 className="text-sm font-semibold text-slate-900">项目</h2>
        <div className="flex items-center gap-1">
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
          >
            <PlusIcon className="size-4" />
          </Button>
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
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onProjectChange(project.id)}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100",
              project.id === activeProjectId && "bg-blue-50 text-blue-700 hover:bg-blue-50",
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[3px] text-white",
                project.color,
              )}
            >
              <span className="size-1.5 rounded-full bg-white" />
            </span>
            <span className="min-w-0 flex-1 truncate">{project.name}</span>
            <span className="shrink-0 text-slate-500">({project.count})</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

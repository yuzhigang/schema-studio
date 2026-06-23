import { cn } from "@repo/ui/lib/utils";
import { FileTextIcon, GitBranchIcon, HistoryIcon, NetworkIcon, Table2Icon } from "lucide-react";

export type DesignerTabId = "design" | "description" | "relations" | "generate" | "changes";

type DesignerTab = {
  id: DesignerTabId;
  label: string;
  icon: typeof Table2Icon;
};

const tabs: DesignerTab[] = [
  { id: "design", label: "表设计", icon: Table2Icon },
  { id: "description", label: "描述", icon: FileTextIcon },
  { id: "relations", label: "关系", icon: NetworkIcon },
  { id: "generate", label: "生成", icon: GitBranchIcon },
  { id: "changes", label: "修改记录", icon: HistoryIcon },
];

type DesignerTabsProps = {
  activeTab: DesignerTabId;
  onTabChange: (tabId: DesignerTabId) => void;
};

export function DesignerTabs({ activeTab, onTabChange }: DesignerTabsProps) {
  return (
    <nav className="flex h-12 items-end gap-6 border-b border-slate-200 bg-slate-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex h-12 items-center gap-1.5 border-b-2 border-transparent px-1 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600",
            activeTab === tab.id && "border-blue-600 text-blue-600",
          )}
        >
          <tab.icon className="size-4" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

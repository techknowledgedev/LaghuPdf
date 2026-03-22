import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center" role="status">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
        <Icon size={28} className="text-indigo-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 max-w-sm">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

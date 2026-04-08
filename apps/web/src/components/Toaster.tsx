import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-indigo-400 shrink-0" />,
};

const styles: Record<ToastVariant, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-indigo-500/30 bg-indigo-500/10",
};

export default function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl max-w-sm",
            "animate-toast-in",
            styles[toast.variant]
          )}
        >
          {icons[toast.variant]}
          <span className="flex-1 text-slate-200">{toast.message}</span>
          <button
            onClick={() => remove(toast.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 rounded"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

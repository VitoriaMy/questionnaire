import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: AlertCircle,
};

export function Alert({ className, tone = "info", children }) {
  const Icon = icons[tone] || AlertCircle;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "info" && "border-slate-200 bg-white/70 text-slate-600",
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="leading-6">{children}</div>
    </div>
  );
}
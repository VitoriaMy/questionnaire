import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FormField({ className, label, htmlFor, description, children }) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {description ? <p className="text-xs leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
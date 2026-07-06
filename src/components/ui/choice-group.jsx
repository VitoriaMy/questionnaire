import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

function ChoiceItem({ id, name, type, value, title, description, required, className, children }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 transition hover:border-primary/30 hover:bg-accent",
        className
      )}
    >
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        required={required}
        className={cn(
          type === "radio" || type === "checkbox"
            ? "mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
            : "sr-only"
        )}
      />
      {children || (
        <span className="grid gap-1">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
        </span>
      )}
    </label>
  );
}

export function CheckboxCardGroup({ name, options, required = true }) {
  return (
    <div className="grid gap-3">
      {options.map((option, index) => (
        <ChoiceItem
          key={option.value}
          id={`${name}-${index}`}
          name={name}
          type="checkbox"
          value={option.value}
          title={option.label}
          description={option.description}
          required={required}
        />
      ))}
    </div>
  );
}

export function RadioCardGroup({ name, options, required = true }) {
  return (
    <div className="grid gap-3">
      {options.map((option, index) => (
        <ChoiceItem
          key={option.value}
          id={`${name}-${index}`}
          name={name}
          type="radio"
          value={option.value}
          title={option.label}
          description={option.description}
          required={required}
        />
      ))}
    </div>
  );
}

export function RatingGroup({ name, min = 1, max = 5, required = true }) {
  const values = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {values.map((value, index) => (
        <ChoiceItem
          key={value}
          id={`${name}-${index}`}
          name={name}
          type="radio"
          value={String(value)}
          required={required}
          className="min-w-[56px] items-center justify-center"
        >
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Star className="h-3.5 w-3.5 text-primary" />
            {value}
          </span>
        </ChoiceItem>
      ))}
    </div>
  );
}
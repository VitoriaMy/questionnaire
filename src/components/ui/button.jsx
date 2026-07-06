import { cloneElement, isValidElement } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glow hover:translate-y-[-1px] hover:brightness-95",
        outline:
          "border border-border bg-white/70 text-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-11 px-5",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant, size, type = "button", ...props }) {
  const { asChild, ...rest } = props;

  if (asChild && isValidElement(rest.children)) {
    const child = rest.children;
    return cloneElement(child, {
      className: cn(buttonVariants({ variant, size }), className, child.props.className),
    });
  }

  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...rest} />;
}

export { Button, buttonVariants };
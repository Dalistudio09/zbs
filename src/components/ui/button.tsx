import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger";
  block?: boolean;
};

export function Button({
  className,
  variant = "primary",
  block,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-md px-5 text-[15px] font-medium tracking-wide",
        "transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100",
        block && "w-full",
        variant === "primary" && "bg-accent text-accent-fg",
        variant === "ghost" && "border border-border bg-transparent text-fg",
        variant === "quiet" && "bg-elevated text-fg",
        variant === "danger" && "bg-danger text-fg",
        className,
      )}
      {...props}
    />
  );
}

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/55 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,var(--brand-accent-strong)_0%,var(--brand-accent)_45%,var(--brand-accent-deep)_130%)] text-[#06231e] hover:brightness-[1.08]",
        secondary:
          "border border-white/[0.07] bg-[linear-gradient(180deg,rgb(255_255_255/0.075)_0%,rgb(255_255_255/0.03)_100%)] text-zinc-100 hover:border-white/[0.12] hover:bg-[linear-gradient(180deg,rgb(255_255_255/0.1)_0%,rgb(255_255_255/0.045)_100%)]",
        ghost:
          "text-zinc-300 hover:bg-white/[0.055] hover:text-zinc-50",
        outline:
          "border border-white/[0.09] bg-transparent hover:border-white/[0.16] hover:bg-white/[0.035]",
        success:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--success)_88%,white)_0%,var(--success)_55%)] text-[#0d1a10] hover:brightness-[1.08]",
        warning:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--warning)_88%,white)_0%,var(--warning)_55%)] text-[#1d1608] hover:brightness-[1.08]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center justify-center gap-1.5 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex h-12 w-9 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/70 font-mono text-lg font-medium tabular-nums text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[border-color,background-color,box-shadow,transform] duration-150 sm:w-11",
        "data-[active=true]:-translate-y-px data-[active=true]:border-teal-400/70 data-[active=true]:bg-teal-400/[0.06] data-[active=true]:shadow-[0_0_0_3px_rgba(45,212,191,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]",
        char && "border-zinc-700 bg-zinc-900 text-teal-200",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-5 w-px animate-pulse bg-teal-300" />
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-2 bottom-1 h-px bg-white/[0.035]" />
    </div>
  );
}

function InputOTPSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className={cn("flex w-3 items-center justify-center text-zinc-700", className)}
      {...props}
    >
      <Minus className="h-3 w-3" aria-hidden="true" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };

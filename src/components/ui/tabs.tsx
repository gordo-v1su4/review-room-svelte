"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-10 items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-1 text-zinc-400",
      className,
    )}
    {...props}
  />
);
export const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors data-[state=active]:bg-white/[0.07] data-[state=active]:text-zinc-50",
      className,
    )}
    {...props}
  />
);
export const TabsContent = TabsPrimitive.Content;

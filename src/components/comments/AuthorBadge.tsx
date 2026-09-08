"use client";

import { cn } from "@/lib/utils";

export type CommentAuthorRole = "admin" | "client";

const ROLE_META: Record<
  CommentAuthorRole,
  {
    label: string;
    bubbleClass: string;
    labelClass: string;
  }
> = {
  admin: {
    label: "Production",
    bubbleClass:
      "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-muted)] text-[color-mix(in_srgb,var(--warning)_70%,white)]",
    labelClass: "text-[color-mix(in_srgb,var(--warning)_80%,transparent)]",
  },
  client: {
    label: "Client",
    bubbleClass:
      "border-[color-mix(in_srgb,var(--info)_30%,transparent)] bg-[var(--info-muted)] text-[color-mix(in_srgb,var(--info)_70%,white)]",
    labelClass: "text-[color-mix(in_srgb,var(--info)_80%,transparent)]",
  },
};

function initialsForName(name: string, role: CommentAuthorRole) {
  const cleaned = name.trim();
  const isGeneric =
    !cleaned ||
    (role === "admin" && cleaned.toLowerCase() === "admin") ||
    (role === "client" && cleaned.toLowerCase() === "reviewer");
  if (isGeneric) {
    return role === "admin" ? "PR" : "CL";
  }

  const parts = cleaned
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0] ?? cleaned).slice(0, 2).toUpperCase();
}

function displayName(name: string, role: CommentAuthorRole) {
  if (role === "admin" && name.trim().toLowerCase() === "admin") {
    return "Production";
  }
  if (role === "client" && name.trim().toLowerCase() === "reviewer") {
    return "Client";
  }
  return name.trim() || ROLE_META[role].label;
}

export function AuthorBadge({
  name,
  role,
  compact = false,
  className,
}: {
  name: string;
  role: CommentAuthorRole;
  compact?: boolean;
  className?: string;
}) {
  const meta = ROLE_META[role];
  const initials = initialsForName(name, role);
  const authorName = displayName(name, role);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full border text-[10px] font-semibold leading-none",
          compact ? "h-5 w-5" : "h-6 w-6",
          meta.bubbleClass,
        )}
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-zinc-300">
          {authorName}
        </span>
        {!compact && (
          <span className={cn("block text-[10px] leading-3", meta.labelClass)}>
            {meta.label}
          </span>
        )}
      </span>
    </span>
  );
}

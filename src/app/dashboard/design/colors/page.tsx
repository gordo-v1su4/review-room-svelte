"use client";

import { AdminGate } from "@/components/auth/AdminGate";

const SWATCH_GROUPS = [
  {
    title: "Brand",
    tokens: ["--brand-accent", "--brand-accent-muted"],
  },
  {
    title: "Semantic",
    tokens: [
      "--success",
      "--success-muted",
      "--warning",
      "--warning-muted",
      "--info",
      "--info-muted",
      "--danger",
      "--danger-muted",
      "--selected",
      "--rating",
      "--annotation",
    ],
  },
  {
    title: "Status",
    tokens: [
      "--status-not-started",
      "--status-in-progress",
      "--status-awaiting",
      "--status-needs-changes",
      "--status-approved",
      "--status-final",
      "--status-omitted",
    ],
  },
];

export default function DesignColorsPage() {
  return (
    <AdminGate>
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600">Design</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Color tokens</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live preview from <code className="text-zinc-400">globals.css</code>. Edit
            `:root` and refresh to experiment.
          </p>
        </div>
        {SWATCH_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-sm font-medium text-zinc-300">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tokens.map((token) => (
                <div
                  key={token}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-md border border-zinc-700"
                    style={{ background: `var(${token})` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-zinc-300">{token}</p>
                    <p
                      className="text-[11px] text-zinc-500"
                      style={{ color: `var(${token})` }}
                    >
                      Sample text
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminGate>
  );
}

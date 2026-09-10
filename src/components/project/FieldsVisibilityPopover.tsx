"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { Check, GripVertical, ListTree, Search } from "lucide-react";
import {
  CARD_FIELD_DEFINITIONS,
  type CardFieldId,
  normalizeVisibleFields,
} from "@/lib/cardFields";
import { cn } from "@/lib/utils";

export function FieldsVisibilityPopover({
  visibleFields,
  fieldOrder,
  iconOnly = false,
  onChange,
}: {
  visibleFields: CardFieldId[];
  fieldOrder: CardFieldId[];
  iconOnly?: boolean;
  onChange: (visible: CardFieldId[], order: CardFieldId[]) => void;
}) {
  const [search, setSearch] = useState("");
  const ordered = useMemo(() => {
    const known = new Set(CARD_FIELD_DEFINITIONS.map((f) => f.id));
    const order = fieldOrder.filter((id) => known.has(id));
    for (const field of CARD_FIELD_DEFINITIONS) {
      if (!order.includes(field.id)) order.push(field.id);
    }
    return order;
  }, [fieldOrder]);

  const filtered = ordered.filter((id) => {
    const label = CARD_FIELD_DEFINITIONS.find((f) => f.id === id)?.label ?? id;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  function toggle(id: CardFieldId) {
    const next = visibleFields.includes(id)
      ? visibleFields.filter((item) => item !== id)
      : [...visibleFields, id];
    onChange(next, ordered);
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={`Fields: ${visibleFields.length} visible`}
          className={cn(
            "inline-flex h-8 min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 sm:min-h-0 sm:min-w-0",
            iconOnly && "w-8 justify-center px-0",
          )}
        >
          <ListTree className="h-3.5 w-3.5" />
          {!iconOnly && `Fields: ${visibleFields.length}`}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="menu-surface z-50 w-64 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-2xl"
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fields…"
              className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-7 pr-2 text-xs outline-none"
            />
          </div>
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {filtered.map((id) => {
              const field = CARD_FIELD_DEFINITIONS.find((item) => item.id === id);
              if (!field) return null;
              const active = visibleFields.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                    active
                      ? "bg-[var(--brand-accent-muted)] text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-900",
                  )}
                >
                  <GripVertical className="h-3 w-3 shrink-0 text-zinc-700" />
                  <span className="flex-1">{field.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-[var(--brand-accent)]" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function useCardFieldPrefs(stored?: {
  visibleCardFields?: string[] | null;
  fieldOrder?: string[] | null;
}) {
  const visibleFields = normalizeVisibleFields(stored?.visibleCardFields);
  const fieldOrder = normalizeVisibleFields(stored?.fieldOrder ?? visibleFields);
  return { visibleFields, fieldOrder };
}

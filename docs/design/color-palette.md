# Review Room — Color Palette

Master reference for semantic color tokens. **Edit `src/app/globals.css` `:root` block to swap the whole palette** — components use CSS variables, not hardcoded Tailwind hues.

## How to swap

1. Open `src/app/globals.css`
2. Change hex values in the `:root` semantic block
3. Reload the app (or visit `/dashboard/design/colors` for a live swatch preview)

Future A/B: move the semantic block to `src/styles/palettes/default.css` and import from `globals.css`.

---

## Neutrals (zinc family)

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#09090b` | App background |
| `--foreground` | `#fafafa` | Primary text |
| `--surface` | `#18181b` | Cards, panels |
| `--surface-elevated` | `#27272a` | Raised surfaces |
| `--border` | `#27272a` | Default borders |
| `--muted` | `#a1a1aa` | Secondary text |

---

## Brand accent (CTAs + chrome only)

| Token | Hex | Role |
|-------|-----|------|
| `--brand-accent` | `#6eb5a8` | Primary CTA, resize seams, selected chrome |
| `--brand-accent-muted` | `rgb(110 181 168 / 0.14)` | Subtle brand backgrounds |

<span style="display:inline-block;width:48px;height:24px;background:#6eb5a8;border-radius:4px;border:1px solid #333"></span> Brand accent

**Do not** use brand accent for status semantics — use semantic tokens below.

---

## Semantic tokens

| Token | Hex | Role |
|-------|-----|------|
| `--success` | `#8aa898` | Approved, completed, positive |
| `--success-muted` | `rgb(138 168 152 / 0.14)` | Success backgrounds |
| `--warning` | `#b8a882` | Needs changes, caution |
| `--warning-muted` | `rgb(184 168 130 / 0.14)` | Warning backgrounds |
| `--info` | `#8aa4b0` | Feedback, comments, informational |
| `--info-muted` | `rgb(138 164 176 / 0.14)` | Info backgrounds |
| `--danger` | `#b88888` | Errors, delete, annotation |
| `--danger-muted` | `rgb(184 136 136 / 0.14)` | Danger backgrounds |
| `--selected` | `#8eb0c4` | Shortlist, selection ring |
| `--approved` | `#8aa898` | Approved state (alias of success tone) |
| `--rating` | `#c4b488` | Star ratings |
| `--annotation` | `#b88888` | Markup / pen tool |

### Swatches

| Success | Warning | Info | Danger |
|---------|---------|------|--------|
| <span style="display:inline-block;width:40px;height:20px;background:#8aa898;border-radius:3px"></span> | <span style="display:inline-block;width:40px;height:20px;background:#b8a882;border-radius:3px"></span> | <span style="display:inline-block;width:40px;height:20px;background:#8aa4b0;border-radius:3px"></span> | <span style="display:inline-block;width:40px;height:20px;background:#b88888;border-radius:3px"></span> |

---

## Status-specific (VideoStatusPill)

| Token | Hex | Status |
|-------|-----|--------|
| `--status-not-started` | `#8a8a90` | Not started |
| `--status-in-progress` | `#9a8eb8` | In progress |
| `--status-awaiting` | `#6eb5a8` | Awaiting review |
| `--status-needs-changes` | `#b8a882` | Needs changes |
| `--status-approved` | `#8aa898` | Approved |
| `--status-final` | `#8aa4b0` | Final |
| `--status-omitted` | `#71717a` | Omitted |

---

## Tailwind usage

Tokens are mapped in `@theme inline` so you can write:

- `text-success`, `bg-success-muted`
- `text-[var(--brand-accent)]`
- `border-[var(--selected)]`

Prefer `bg-success/10` style only when the token exposes a muted pair; use `--*-muted` vars for pills and badges.

---

## Migration checklist

When adding UI, **never** introduce new `emerald-*`, `amber-*`, `sky-*`, or raw `teal-*` for semantics. Use tokens from this sheet.

High-traffic components already migrated: `VideoStatusPill`, `VideoCard`, `VideoRatingControl`, `CommentList`, `AuthorBadge`, `button` variants, `ProjectWorkspace` stats, panel resize handles.

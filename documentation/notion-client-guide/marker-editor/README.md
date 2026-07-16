# marker.js docs annotator

Interactive annotation studio for Review Room client-guide screenshots.

## Run

```bash
bun run docs:annotate
# → http://127.0.0.1:4177
```

Prefill / refresh draft markers:

```bash
bun documentation/notion-client-guide/marker-editor/seed-annotations.ts
```

Then hard-refresh the editor and adjust.

## Workflow

1. Pick a screenshot (`screenshots/raw/` — full PNG)
2. Tweak caption frames / arrows / number badges
3. Select a caption frame → **Dim outside selected frame**
4. Use **Style selected** for opacity, colors, font size, label text
5. **Save state** then **Export PNG** (natural size)

## Tools

| Tool | Use |
|------|-----|
| Caption frame | Box a UI region with a strong header (preferred) |
| Arrow | Point to a control |
| Number badge | Text marker with just `1`, `2`, … at the arrow base |
| Dim outside frame | Spotlight: darken everything except the selected frame |
| Style selected | Stroke / fill / text color / opacity / font size |

Avoid speech-bubble **Callout** when a caption frame or numbered arrow is enough.

## Quality

- Annotate **raw PNG only** — never JPG, never re-annotate an export
- State: `annotations/*.marker.json`
- Export: `screenshots/annotated/*-annotated.png`
- Outline may compress once to JPEG on upload — that file is not a source
- Editing zoom (Fit / ±) is for the UI only; export is always full resolution

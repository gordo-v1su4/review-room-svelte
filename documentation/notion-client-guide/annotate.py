"""
Annotate screenshots with numbered badges + a clean side legend panel.
Legend always sits on the RIGHT so the UI stays left-aligned with doc headings.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "screenshots"
OUT = ROOT / "screenshots" / "annotated"
OUT.mkdir(parents=True, exist_ok=True)

# (nx, ny, label) — badge center as fractions of the *original* screenshot
CALLOUTS: dict[str, list[tuple[float, float, str]]] = {
    "04-project-workspace-root.png": [
        (0.08, 0.12, "Sidebar — Projects, Inbox, folders"),
        (0.08, 0.42, "Smart folders — Videos / Images / Contact sheets"),
        (0.08, 0.62, "Date folders — browse by shoot day"),
        (0.42, 0.10, "Project title + description"),
        (0.88, 0.12, "Access — who can open this project"),
        (0.35, 0.28, "Status summary — Awaiting / Feedback / Selected / Approved"),
        (0.45, 0.40, "Smart views — filter by review state"),
        (0.35, 0.48, "Layout + Appearance + type filters + Newest sort"),
        (0.50, 0.70, "Folder cards — open a folder to review media"),
    ],
    "05-images-grid.png": [
        (0.08, 0.38, "Images smart folder (active)"),
        (0.42, 0.38, "Awaiting Review / Selected / Has Feedback tabs"),
        (0.28, 0.46, "Grid / Group / Table / Review layouts"),
        (0.40, 0.46, "Appearance — card size, fit/fill, card info"),
        (0.55, 0.46, "VID / IMG / CTX / STB type chips"),
        (0.72, 0.46, "Search"),
        (0.82, 0.46, "Sort — Newest / Oldest / Rating / Comments"),
        (0.50, 0.70, "Media cards — click to open details"),
        (0.42, 0.78, "Status badge on each card"),
    ],
    "06-appearance-controls.png": [
        (0.305, 0.428, "Card size S / M / L — make the grid denser"),
        (0.305, 0.448, "Aspect ratio — landscape / square / portrait"),
        (0.305, 0.468, "Thumbnail scale — Fit or Fill"),
        (0.325, 0.488, "Show card info — titles, ratings, badges"),
    ],
    "07-image-selected.png": [
        (0.42, 0.62, "Selected card (blue outline)"),
        (0.88, 0.18, "Details panel — Expand / close"),
        (0.88, 0.38, "Large preview of the asset"),
        (0.88, 0.55, "Status + who uploaded it"),
        (0.88, 0.66, "Star rating"),
        (0.88, 0.72, "Shortlist (Selected)"),
        (0.88, 0.82, "Leave a note + Add comment"),
    ],
    "08-image-markup-lightbox.png": [
        (0.18, 0.08, "Asset name / original filename"),
        (0.62, 0.08, "Draw color — red / orange / green / blue"),
        (0.70, 0.08, "Stroke thickness"),
        (0.76, 0.08, "Undo last stroke"),
        (0.80, 0.08, "Clear markup"),
        (0.86, 0.08, "Save markup to the asset"),
        (0.92, 0.08, "Rate + Shortlist while previewing"),
        (0.50, 0.50, "Draw directly on the image"),
    ],
    "12-video-details-comments.png": [
        (0.42, 0.55, "Selected video in the grid"),
        (0.88, 0.30, "Playback + timeline scrub"),
        (0.88, 0.42, "Show frames — frame readout toggle"),
        (0.88, 0.58, "Rate + Shortlist"),
        (0.88, 0.70, "Comment box + Pin to current time"),
        (0.88, 0.84, "Existing comments + reactions"),
    ],
    "09-selected-view.png": [
        (0.48, 0.38, "Selected smart view — shortlisted assets only"),
        (0.55, 0.46, "CTX chip — contact sheets in this shortlist"),
        (0.82, 0.46, "Sort stays on Newest"),
    ],
    "10-table-view.png": [
        (0.30, 0.46, "Table layout"),
        (0.45, 0.58, "Shot / Asset column"),
        (0.58, 0.58, "Status"),
        (0.65, 0.58, "Feedback Open"),
        (0.72, 0.58, "Rating"),
        (0.85, 0.58, "Updated date — find latest activity"),
    ],
    "11-has-feedback-view.png": [
        (0.48, 0.38, "Has Feedback — only assets with notes"),
        (0.48, 0.62, "Comment count on cards"),
        (0.55, 0.58, "New notes badge"),
    ],
    "13-inbox-feedback-digest.png": [
        (0.08, 0.18, "Inbox — feedback digest"),
        (0.45, 0.22, "Grouped by project + day"),
        (0.70, 0.30, "Needs attention badge"),
        (0.88, 0.40, "Mark handled / Handled"),
        (0.40, 0.42, "Click a row to jump back to the asset"),
    ],
    "03-projects-list.png": [
        (0.08, 0.14, "Projects"),
        (0.08, 0.20, "Inbox"),
        (0.40, 0.35, "Shared project card"),
        (0.42, 0.48, "Media / Awaiting / Feedback counts"),
    ],
}

# Slightly transparent markers so UI still reads underneath (a tad under full opacity)
TEAL_FILL = (45, 212, 191, 195)
TEAL_SOLID = (45, 212, 191, 230)
TEAL_STRIP = (45, 212, 191, 255)
INK = (15, 23, 42, 220)
PANEL_BG = (24, 24, 27, 255)
TEXT = (244, 244, 245, 255)
MUTED = (161, 161, 170, 255)
ITEM_GAP = 22


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def crop_sign_in() -> None:
    src = SHOTS / "01-sign-in.png"
    img = Image.open(src).convert("RGB")
    w, h = img.size
    pixels = img.load()
    assert pixels is not None

    def is_content(x: int, y: int) -> bool:
        r, g, b = pixels[x, y]
        return (r + g + b) > 35

    step = 2
    xs: list[int] = []
    ys: list[int] = []
    for y in range(0, h, step):
        for x in range(0, w, step):
            if is_content(x, y):
                xs.append(x)
                ys.append(y)
    if not xs:
        print("sign-in: no content found, skipping crop")
        return

    left, right = min(xs), max(xs)
    top, bottom = min(ys), max(ys)
    pad_x = int((right - left) * 0.22)
    pad_y = int((bottom - top) * 0.28)
    box = (
        max(0, left - pad_x),
        max(0, top - pad_y),
        min(w, right + pad_x),
        min(h, bottom + pad_y),
    )
    cropped = img.crop(box)
    cropped.save(src, "PNG", optimize=True)
    print(f"cropped sign-in {img.size} -> {cropped.size}")


def draw_badge(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    n: int,
    radius: int,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int, int] = TEAL_FILL,
) -> None:
    draw.ellipse(
        (x - radius + 1, y - radius + 2, x + radius + 1, y + radius + 2),
        fill=(0, 0, 0, 55),
    )
    draw.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=fill,
        outline=INK,
        width=max(2, radius // 9),
    )
    label = str(n)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x - tw / 2 - bbox[0]
    ty = y - th / 2 - bbox[1] + max(1, radius // 12)
    draw.text((tx, ty), label, fill=INK, font=font)


def wrap_by_width(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
) -> list[str]:
    """Wrap text to a pixel width (avoids uneven char-based wrapping)."""
    words = text.split()
    if not words:
        return [text]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def measure_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.ImageFont,
) -> tuple[int, list[int]]:
    """Return total block height and per-line advance (no overlapping glyphs)."""
    advances: list[int] = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        # Prefer generous spacing: font size * 1.45 beats tight textbbox stacking
        advances.append(max(bbox[3] - bbox[1] + 6, int(getattr(font, "size", 16) * 1.45)))
    return sum(advances), advances


def annotate(src_name: str, items: list[tuple[float, float, str]]) -> Path:
    src = SHOTS / src_name
    shot = Image.open(src).convert("RGBA")
    sw, sh = shot.size

    title_font = load_font(max(20, sh // 58), bold=True)
    subtitle_font = load_font(max(13, sh // 90))
    body_font = load_font(max(15, sh // 68))
    badge_font = load_font(max(15, sh // 62), bold=True)

    # Wider panel = fewer wraps = cleaner list
    panel_w = max(380, int(sw * 0.32))
    pad = 24
    badge_r = max(11, sh // 90)
    strip = 4

    measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    text_col_w = panel_w - pad * 2 - badge_r * 2 - 14

    rows: list[tuple[int, list[str], int, list[int]]] = []
    for i, (_nx, _ny, label) in enumerate(items, start=1):
        lines = wrap_by_width(measure, label, body_font, text_col_w)
        text_h, advances = measure_lines(measure, lines, body_font)
        block_h = max(badge_r * 2 + 4, text_h)
        rows.append((i, lines, block_h, advances))

    title_bbox = measure.textbbox((0, 0), "Callouts", font=title_font)
    title_h = title_bbox[3] - title_bbox[1]
    sub_bbox = measure.textbbox((0, 0), "Match numbers on the screen", font=subtitle_font)
    sub_h = sub_bbox[3] - sub_bbox[1]
    header_h = pad + title_h + 10 + sub_h + 24

    content_h = header_h + sum(h + ITEM_GAP for _i, _l, h, _a in rows) + pad
    canvas_h = max(sh, content_h)
    canvas = Image.new("RGBA", (sw + panel_w, canvas_h), (9, 9, 11, 255))

    # Screenshot flush left; callouts always on the right
    shot_y = (canvas_h - sh) // 2
    canvas.paste(shot, (0, shot_y))

    draw = ImageDraw.Draw(canvas)
    px0 = sw
    draw.rectangle((px0, 0, px0 + panel_w, canvas_h), fill=PANEL_BG)
    draw.rectangle((px0, 0, px0 + strip, canvas_h), fill=TEAL_STRIP)

    # Header — stacked with measured heights (no overlap)
    y = pad
    draw.text((px0 + pad, y), "Callouts", fill=TEXT, font=title_font)
    y += title_h + 10
    draw.text(
        (px0 + pad, y),
        "Match numbers on the screen",
        fill=MUTED,
        font=subtitle_font,
    )
    y += sub_h + 28

    for n, lines, block_h, advances in rows:
        cy = y + block_h // 2
        draw_badge(
            draw,
            px0 + pad + badge_r,
            cy,
            n,
            badge_r,
            badge_font,
            fill=TEAL_SOLID,
        )
        tx = px0 + pad + badge_r * 2 + 14
        text_h = sum(advances)
        ty = y + (block_h - text_h) // 2
        for line, adv in zip(lines, advances):
            draw.text((tx, ty), line, fill=TEXT, font=body_font)
            ty += adv
        y += block_h + ITEM_GAP

    # Markers on the screenshot (more transparent so UI stays readable)
    marker_r = max(14, min(sw, sh) // 58)
    marker_font = load_font(max(16, int(marker_r * 1.05)), bold=True)
    for i, (nx, ny, _label) in enumerate(items, start=1):
        x = int(nx * sw)
        yb = shot_y + int(ny * sh)
        x = min(max(x, marker_r + 4), sw - marker_r - 4)
        yb = min(max(yb, shot_y + marker_r + 4), shot_y + sh - marker_r - 4)
        draw_badge(draw, x, yb, i, marker_r, marker_font, fill=TEAL_FILL)

    out = OUT / src_name.replace(".png", "-annotated.png")
    # Composite alpha onto page background so badge transparency actually shows
    flat = Image.new("RGBA", canvas.size, (9, 9, 11, 255))
    flat = Image.alpha_composite(flat, canvas).convert("RGB")
    flat.save(out, "PNG", optimize=True)
    print(f"wrote {out.name} ({flat.size[0]}x{flat.size[1]}, legend=right)")
    return out


def write_callout_manifest() -> None:
    manifest = {
        name: [{"n": i, "label": label} for i, (_x, _y, label) in enumerate(items, start=1)]
        for name, items in CALLOUTS.items()
    }
    path = ROOT / "callouts.json"
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {path.name}")


def main() -> None:
    crop_sign_in()
    write_callout_manifest()
    for name, items in CALLOUTS.items():
        if not (SHOTS / name).exists():
            print(f"skip missing {name}")
            continue
        annotate(name, items)


if __name__ == "__main__":
    main()

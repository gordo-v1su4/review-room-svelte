/**
 * ftrack-style plates — draw-over pass (user red marks + comments).
 *
 * bun documentation/notion-client-guide/annotate-ftrack.ts
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const ROOT = join(import.meta.dir);
const RAW = join(ROOT, "screenshots", "raw");
const OUT = join(ROOT, "screenshots", "annotated");
const QA = join(OUT, "_qa");
mkdirSync(OUT, { recursive: true });
mkdirSync(QA, { recursive: true });

const TEAL = "#2dd4bf";

type Box = { x: number; y: number; w: number; h: number };
type Arrow = { fromX: number; fromY: number; toX: number; toY: number };
type NumberMark = { n: number; x: number; y: number };

type Plate = {
  src: string;
  out: string;
  crop: Box;
  boxes?: Box[];
  arrows?: Arrow[];
  numbers?: NumberMark[];
  rx?: number;
  clean?: boolean;
};

function esc(n: number) {
  return Math.round(n);
}

function padBox(b: Box, pad: number): Box {
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

function arrowToBox(
  box: Box,
  side: "left" | "right" | "top" | "bottom",
  gap = 36,
  shaft = 90,
): Arrow {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  if (side === "left") {
    return { fromX: box.x - gap - shaft, fromY: cy, toX: box.x - gap, toY: cy };
  }
  if (side === "right") {
    return {
      fromX: box.x + box.w + gap + shaft,
      fromY: cy,
      toX: box.x + box.w + gap,
      toY: cy,
    };
  }
  if (side === "top") {
    return { fromX: cx, fromY: box.y - gap - shaft, toX: cx, toY: box.y - gap };
  }
  return {
    fromX: cx,
    fromY: box.y + box.h + gap + shaft,
    toX: cx,
    toY: box.y + box.h + gap,
  };
}

function boxSvg(b: Box, rx = 14) {
  return `<rect x="${esc(b.x)}" y="${esc(b.y)}" width="${esc(b.w)}" height="${esc(b.h)}" rx="${rx}" ry="${rx}" fill="none" stroke="${TEAL}" stroke-width="5"/>`;
}

function arrowSvg(a: Arrow) {
  const dx = a.toX - a.fromX;
  const dy = a.toY - a.fromY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 36;
  const hx = a.toX - ux * head;
  const hy = a.toY - uy * head;
  const px = -uy;
  const py = ux;
  return `
    <line x1="${esc(a.fromX)}" y1="${esc(a.fromY)}" x2="${esc(hx)}" y2="${esc(hy)}" stroke="${TEAL}" stroke-width="9" stroke-linecap="round"/>
    <polygon points="${esc(a.toX)},${esc(a.toY)} ${esc(hx + px * 14)},${esc(hy + py * 14)} ${esc(hx - px * 14)},${esc(hy - py * 14)}" fill="${TEAL}"/>
  `;
}

/** Teal number with dark halo so it pops on dark UI. */
function numberSvg(m: NumberMark) {
  const x = esc(m.x);
  const y = esc(m.y);
  const common = `x="${x}" y="${y}" font-size="52" font-weight="700" font-family="Helvetica, Arial, sans-serif" text-anchor="middle" dominant-baseline="central"`;
  return `
    <circle cx="${x}" cy="${y}" r="28" fill="#000000" fill-opacity="0.55"/>
    <text ${common} fill="#000000" fill-opacity="0.85" stroke="#000000" stroke-width="10" stroke-linejoin="round" paint-order="stroke">${m.n}</text>
    <text ${common} fill="${TEAL}">${m.n}</text>
  `;
}

async function render(plate: Plate) {
  const input = join(RAW, plate.src);
  if (!existsSync(input)) {
    console.warn(`skip missing ${plate.src}`);
    return;
  }
  const meta = await sharp(input).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const c = plate.crop;
  const rx = plate.rx ?? 14;
  const hasMarks =
    (plate.boxes?.length ?? 0) +
      (plate.arrows?.length ?? 0) +
      (plate.numbers?.length ?? 0) >
    0;

  let pipeline: sharp.Sharp;
  if (plate.clean || !hasMarks) {
    pipeline = sharp(input).extract({
      left: esc(c.x),
      top: esc(c.y),
      width: Math.min(esc(c.w), W - esc(c.x)),
      height: Math.min(esc(c.h), H - esc(c.y)),
    });
  } else {
    const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${(plate.boxes ?? []).map((b) => boxSvg(b, rx)).join("\n")}
  ${(plate.arrows ?? []).map(arrowSvg).join("\n")}
  ${(plate.numbers ?? []).map(numberSvg).join("\n")}
</svg>`);
    const annotated = await sharp(input)
      .composite([{ input: svg, top: 0, left: 0 }])
      .png()
      .toBuffer();
    pipeline = sharp(annotated).extract({
      left: esc(c.x),
      top: esc(c.y),
      width: Math.min(esc(c.w), W - esc(c.x)),
      height: Math.min(esc(c.h), H - esc(c.y)),
    });
  }

  const dest = join(OUT, plate.out);
  await pipeline.png().toFile(dest);
  const outMeta = await sharp(dest).metadata();
  console.log(
    `wrote ${plate.out} (${outMeta.width}x${outMeta.height})${plate.clean ? " [clean]" : ""}`,
  );
}

// Measured via Playwright at 1494×964, scaled ×2 to 2987×1928
const S = 2;

const projectCard = {
  x: 264 * S,
  y: 96 * S,
  w: 391 * S,
  h: 179 * S,
};

const uploadDest = {
  x: 1169 * S,
  y: 105 * S,
  w: 288 * S,
  h: 36 * S,
};
const uploadDropCenter = { x: 867 * S, y: 250 * S }; // upload icon (above label)
const uploadTypes = padBox(
  {
    x: 726 * S,
    y: 331 * S,
    w: (1008 - 726) * S,
    h: 28 * S,
  },
  10,
);

const browseCard = {
  x: 272 * S,
  y: 424 * S,
  w: 187 * S,
  h: 265 * S,
};

const appearanceMenu = {
  x: 586 * S,
  y: 350 * S,
  w: 244 * S,
  h: (534 - 350) * S, // button + open menu
};

const selectedTab = padBox({ x: 1618, y: 448, w: 185, h: 56 }, 10);
const hasFeedbackTab = padBox({ x: 1428, y: 448, w: 185, h: 56 }, 10);

// §9 details actions — measured with panel scrolled so stars→Add comment fit
const rateShortlist = padBox(
  { x: 1083 * S, y: 451 * S, w: 387 * S, h: 32 * S },
  10,
);
const markForDelete = padBox(
  { x: 1083 * S, y: 499 * S, w: 190 * S, h: 36 * S },
  10,
);
const noteAndAdd = padBox(
  { x: 1083 * S, y: 551 * S, w: 387 * S, h: (639 + 32 - 551) * S },
  10,
);

const scrubBar = padBox(
  { x: 1103 * S, y: 362 * S, w: 347 * S, h: 24 * S },
  8,
);
// Leave a note textarea only (Add comment sits on the pin row)
const leaveNote = padBox(
  { x: 1083 * S, y: 647 * S, w: 387 * S, h: 80 * S },
  8,
);
// Pin to current time only — keep narrow so Add comment stays outside
const pinTime = padBox(
  { x: 1083 * S, y: 735 * S, w: 130 * S, h: 28 * S },
  8,
);

const markupTools = { x: 2080, y: 14, w: 860, h: 78 };

const plates: Plate[] = [
  {
    src: "03-projects-list.png",
    out: "03-projects-list-annotated.png",
    crop: {
      x: projectCard.x - 140,
      y: projectCard.y - 70,
      w: projectCard.w + 220,
      h: projectCard.h + 140,
    },
    boxes: [projectCard],
    arrows: [arrowToBox(projectCard, "left", 36, 90)],
    rx: 16,
  },
  {
    src: "04-project-workspace-root.png",
    out: "04-project-workspace-root-annotated.png",
    crop: { x: 0, y: 0, w: 2987, h: 1928 },
    numbers: [
      { n: 1, x: 50, y: 280 },
      { n: 2, x: 2680, y: 210 },
      { n: 3, x: 720, y: 480 },
      { n: 4, x: 720, y: 700 },
      { n: 5, x: 780, y: 1120 },
    ],
  },
  {
    src: "14-upload-media.png",
    out: "14-upload-media-annotated.png",
    // Crop empty black bottom — UI ends just under type pills
    crop: { x: 250, y: 70, w: 2480, h: 680 },
    numbers: [
      { n: 1, x: uploadDest.x - 150, y: uploadDest.y + uploadDest.h / 2 },
      { n: 2, x: uploadDropCenter.x, y: uploadDropCenter.y },
      { n: 3, x: uploadTypes.x - 90, y: uploadTypes.y + uploadTypes.h / 2 },
    ],
    boxes: [uploadTypes],
    arrows: [
      {
        fromX: uploadDest.x - 130,
        fromY: uploadDest.y + uploadDest.h / 2,
        toX: uploadDest.x - 16,
        toY: uploadDest.y + uploadDest.h / 2,
      },
      arrowToBox(uploadTypes, "left", 28, 55),
    ],
    rx: 10,
  },
  {
    src: "05-images-grid.png",
    out: "05-images-grid-annotated.png",
    crop: {
      x: browseCard.x - 80,
      y: browseCard.y - 60,
      w: browseCard.w + 280,
      h: browseCard.h + 120,
    },
    boxes: [browseCard],
    arrows: [arrowToBox(browseCard, "right", 32, 70)],
    rx: 14,
  },
  {
    src: "06-appearance-controls.png",
    out: "06-appearance-controls-annotated.png",
    crop: {
      x: appearanceMenu.x - 140,
      y: appearanceMenu.y - 50,
      w: appearanceMenu.w + 220,
      h: appearanceMenu.h + 80,
    },
    boxes: [appearanceMenu],
    arrows: [arrowToBox(appearanceMenu, "left", 32, 70)],
    rx: 12,
  },
  {
    src: "09-selected-view.png",
    out: "09-selected-view-annotated.png",
    crop: { x: 1480, y: 400, w: 560, h: 180 },
    boxes: [selectedTab],
    arrows: [arrowToBox(selectedTab, "right", 36, 70)],
  },
  {
    src: "11-has-feedback-view.png",
    out: "11-has-feedback-view-annotated.png",
    crop: { x: 1260, y: 400, w: 560, h: 180 },
    boxes: [hasFeedbackTab],
    arrows: [arrowToBox(hasFeedbackTab, "left", 36, 70)],
  },
  {
    src: "07-image-selected.png",
    out: "07-image-selected-annotated.png",
    // Tight crop on stars → Mark for delete → Leave a note / Add comment
    crop: { x: 2040, y: 820, w: 920, h: 620 },
    numbers: [
      { n: 1, x: rateShortlist.x - 55, y: rateShortlist.y + rateShortlist.h / 2 },
      { n: 2, x: markForDelete.x - 55, y: markForDelete.y + markForDelete.h / 2 },
      { n: 3, x: noteAndAdd.x - 55, y: noteAndAdd.y + noteAndAdd.h / 2 },
    ],
    boxes: [rateShortlist, markForDelete, noteAndAdd],
    arrows: [
      arrowToBox(rateShortlist, "left", 28, 45),
      arrowToBox(markForDelete, "left", 28, 45),
      arrowToBox(noteAndAdd, "left", 28, 45),
    ],
    rx: 10,
  },
  {
    src: "12-video-details-comments.png",
    out: "12-video-details-comments-annotated.png",
    crop: { x: 2040, y: 620, w: 920, h: 1050 },
    numbers: [
      { n: 1, x: scrubBar.x - 55, y: scrubBar.y + scrubBar.h / 2 },
      { n: 2, x: pinTime.x - 55, y: pinTime.y + pinTime.h / 2 },
      { n: 3, x: leaveNote.x - 55, y: leaveNote.y + leaveNote.h / 2 },
    ],
    boxes: [scrubBar, pinTime, leaveNote],
    arrows: [
      arrowToBox(scrubBar, "left", 28, 45),
      arrowToBox(pinTime, "left", 24, 40),
      arrowToBox(leaveNote, "left", 28, 45),
    ],
    rx: 10,
  },
  {
    src: "08-image-markup-lightbox.png",
    out: "08-image-markup-lightbox-annotated.png",
    crop: { x: 2050, y: 0, w: 920, h: 190 },
    boxes: [markupTools],
    arrows: [arrowToBox(markupTools, "bottom", 28, 45)],
    rx: 12,
  },
  {
    src: "10-table-view.png",
    out: "10-table-view-annotated.png",
    crop: { x: 280, y: 420, w: 2300, h: 1100 },
    clean: true,
  },
  {
    src: "13-inbox-feedback-digest.png",
    out: "13-inbox-feedback-digest-annotated.png",
    crop: { x: 0, y: 0, w: 2987, h: 1928 },
    numbers: [{ n: 1, x: 90, y: 280 }],
  },
];

async function main() {
  for (const plate of plates) await render(plate);

  if (existsSync(join(OUT, "15-mark-for-delete-annotated.png"))) {
    console.log("kept 15-mark-for-delete-annotated.png");
  }

  for (const f of [
    ...plates.map((p) => p.out),
    "15-mark-for-delete-annotated.png",
  ]) {
    const p = join(OUT, f);
    if (!existsSync(p)) continue;
    await sharp(p)
      .jpeg({ quality: 90 })
      .toFile(join(QA, f.replace(".png", ".jpg")));
  }
  writeFileSync(join(QA, "CHECKLIST.txt"), "draw-over pass — Jul 14\n");
  console.log("\nDone. Visually check screenshots/annotated/_qa/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

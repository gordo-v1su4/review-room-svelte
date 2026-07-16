/**
 * Prefill annotation plates — visually targeted to real UI controls.
 * Font 40px. No white cards. Sign-in has no markers (markdown only).
 *
 * bun documentation/notion-client-guide/marker-editor/seed-annotations.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const ROOT = join(import.meta.dir, "..");
const RAW = join(ROOT, "screenshots", "raw");
const OUT = join(ROOT, "annotations");
mkdirSync(OUT, { recursive: true });

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const TEAL = "#2dd4bf";
const HEADER = "#0d9488";
const FONT = { value: 40, units: "px", step: 1 };
const FONT_TIP = { value: 40, units: "px", step: 1 };
const FRAME_OPACITY = 0.8;
const LINE_H = 48;

type Box = { x: number; y: number; w: number; h: number };

function dimOutside(W: number, H: number, box: Box, opacity = 0.58) {
  const { x, y, w, h } = box;
  return [
    { left: 0, top: 0, width: W, height: Math.max(0, y) },
    { left: 0, top: y + h, width: W, height: Math.max(0, H - (y + h)) },
    { left: 0, top: y, width: Math.max(0, x), height: h },
    { left: x + w, top: y, width: Math.max(0, W - (x + w)), height: h },
  ]
    .filter((p) => p.width > 2 && p.height > 2)
    .map((p) => ({
      typeName: "CoverMarker",
      ...p,
      rotationAngle: 0,
      fillColor: "#000000",
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity,
      visualTransformMatrix: I,
      containerTransformMatrix: I,
    }));
}

function unionBox(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const btm = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: btm - y };
}

function frame(box: Box, title: string) {
  return {
    typeName: "CaptionFrameMarker",
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    rotationAngle: 0,
    text: title,
    color: "#ffffff",
    fillColor: HEADER,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: FONT,
    padding: 8,
    strokeColor: TEAL,
    strokeWidth: 4,
    strokeDasharray: "",
    opacity: FRAME_OPACITY,
    visualTransformMatrix: I,
    containerTransformMatrix: I,
  };
}

function tip(x: number, y: number, lines: string[]) {
  return lines.map((line, i) => ({
    typeName: "TextMarker",
    left: x,
    top: y + i * LINE_H,
    width: Math.max(48, Math.ceil(line.length * 40 * 0.55) + 6),
    height: LINE_H,
    rotationAngle: 0,
    text: line,
    color: "#f4f4f5",
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: FONT_TIP,
    padding: 0,
    strokeColor: "transparent",
    strokeWidth: 0,
    strokeDasharray: "",
    opacity: 1,
    visualTransformMatrix: I,
    containerTransformMatrix: I,
  }));
}

function plate(
  W: number,
  H: number,
  focuses: Box[],
  frames: Array<{ box: Box; title: string }>,
  tipLines: string[],
  tipAt: { x: number; y: number },
) {
  const hole = unionBox(focuses);
  return {
    version: 3,
    width: W,
    height: H,
    defaultFilter: "url(#dropShadow)",
    markers: [
      ...dimOutside(W, H, hole),
      ...frames.map((f) => frame(f.box, f.title)),
      ...tip(tipAt.x, tipAt.y, tipLines),
    ],
  };
}

async function size(name: string) {
  const meta = await sharp(join(RAW, name)).metadata();
  return { W: meta.width!, H: meta.height! };
}

function write(name: string, data: unknown) {
  const path = join(OUT, name.replace(/\.png$/, ".marker.json"));
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log("wrote", path);
}

async function main() {
  // 1. Sign-in — markdown only
  {
    const name = "01-sign-in.png";
    const { W, H } = await size(name);
    write(name, { version: 3, width: W, height: H, markers: [] });
  }

  // 2. Projects
  {
    const name = "03-projects-list.png";
    const { W, H } = await size(name);
    const card = { x: 340, y: 240, w: 920, h: 480 };
    write(
      name,
      plate(
        W,
        H,
        [card],
        [{ box: card, title: "Open a project" }],
        ["Only projects shared with you appear here.", "Click a card to enter the workspace."],
        { x: 1320, y: 280 },
      ),
    );
  }

  // 3. Workspace map
  {
    const name = "04-project-workspace-root.png";
    const { W, H } = await size(name);
    const main = { x: 270, y: 120, w: 1900, h: 620 };
    write(
      name,
      plate(
        W,
        H,
        [main],
        [{ box: main, title: "Project workspace" }],
        [
          "Left: folders and smart collections.",
          "Top: status counts + filters.",
          "Header: Upload and Access.",
        ],
        { x: 40, y: 160 },
      ),
    );
  }

  // 4. Browse
  {
    const name = "05-images-grid.png";
    const { W, H } = await size(name);
    const grid = { x: 280, y: 480, w: 1800, h: 900 };
    write(
      name,
      plate(
        W,
        H,
        [grid],
        [{ box: grid, title: "Media grid" }],
        ["Open Images or a date folder.", "Click a card to open details."],
        { x: 40, y: 500 },
      ),
    );
  }

  // 5. Appearance
  {
    const name = "06-appearance-controls.png";
    const { W, H } = await size(name);
    const pop = { x: 845, y: 580, w: 430, h: 320 };
    write(
      name,
      plate(
        W,
        H,
        [pop],
        [{ box: pop, title: "Change the appearance" }],
        [
          "Change card size, aspect ratio,",
          "and thumbnail fit or fill.",
          "Turn off Show card info to hide",
          "titles for cleaner picture previews.",
        ],
        { x: 1320, y: 600 },
      ),
    );
  }

  // 6. Selected (slide 9 in guide numbering was wrong before — this is 09 file)
  // Two clear targets: Selected filter tab + bookmark on a card
  {
    const name = "09-selected-view.png";
    const { W, H } = await size(name);
    // Smart-view row: Selected is active near mid-right of the filter strip
    const selectedTab = { x: 1220, y: 348, w: 190, h: 52 };
    // First grid card bookmark (top-right corner of card)
    const bookmark = { x: 680, y: 520, w: 90, h: 70 };
    write(
      name,
      plate(
        W,
        H,
        [selectedTab, bookmark],
        [
          { box: selectedTab, title: "Selected" },
          { box: bookmark, title: "Bookmark" },
        ],
        [
          "Click the bookmark on a card to shortlist it.",
          "Click Selected to see only those picks.",
        ],
        { x: 40, y: 360 },
      ),
    );
  }

  // 7. Has Feedback
  {
    const name = "11-has-feedback-view.png";
    const { W, H } = await size(name);
    const hasFeedback = { x: 980, y: 348, w: 230, h: 52 };
    write(
      name,
      plate(
        W,
        H,
        [hasFeedback],
        [{ box: hasFeedback, title: "Has Feedback" }],
        [
          "Click Has Feedback to jump to assets",
          "that already have notes or comments.",
        ],
        { x: 40, y: 360 },
      ),
    );
  }

  // 8. Details panel — rate, shortlist, comment
  {
    const name = "07-image-selected.png";
    const { W, H } = await size(name);
    const panel = { x: 1760, y: 980, w: 1050, h: 720 };
    write(
      name,
      plate(
        W,
        H,
        [panel],
        [{ box: panel, title: "Review this asset" }],
        [
          "Rate it with the stars.",
          "Click Shortlist (bookmark) to save a pick.",
          "Type a note, then click Add comment.",
        ],
        { x: 320, y: 1040 },
      ),
    );
  }

  // 9. Video
  {
    const name = "12-video-details-comments.png";
    const { W, H } = await size(name);
    const panel = { x: 1760, y: 220, w: 1050, h: 1400 };
    write(
      name,
      plate(
        W,
        H,
        [panel],
        [{ box: panel, title: "Video review" }],
        [
          "Play and scrub the timeline.",
          "Pin a comment to the current time",
          "if you want feedback on a moment.",
        ],
        { x: 320, y: 260 },
      ),
    );
  }

  // 10. Markup toolbar
  {
    const name = "08-image-markup-lightbox.png";
    const { W, H } = await size(name);
    const tools = { x: 520, y: 30, w: 1800, h: 110 };
    write(
      name,
      plate(
        W,
        H,
        [tools],
        [{ box: tools, title: "Markup tools" }],
        [
          "Pick a color and stroke, draw on the image,",
          "then click Save. Works on stills only.",
        ],
        { x: 520, y: 180 },
      ),
    );
  }

  // 11. Table
  {
    const name = "10-table-view.png";
    const { W, H } = await size(name);
    const table = { x: 300, y: 460, w: 2200, h: 1000 };
    write(
      name,
      plate(
        W,
        H,
        [table],
        [{ box: table, title: "Table view" }],
        [
          "Scan Shot, Status, Feedback, Rating,",
          "and Updated in one list.",
        ],
        { x: 320, y: 200 },
      ),
    );
  }

  // 12. Inbox
  {
    const name = "13-inbox-feedback-digest.png";
    const { W, H } = await size(name);
    const list = { x: 300, y: 160, w: 2100, h: 1200 };
    write(
      name,
      plate(
        W,
        H,
        [list],
        [{ box: list, title: "Inbox" }],
        [
          "See feedback across projects.",
          "Click a row to open that asset.",
          "Mark handled when you are done.",
        ],
        { x: 40, y: 200 },
      ),
    );
  }

  console.log("\nDone — font 40, retargeted Selected / Has Feedback / details.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Publish / update the Review Room client guide on Outline.
 * ftrack-style: searchable steps in markdown; tight cropped screenshots with one box+arrow.
 *
 * Usage (from repo root; Bun loads .env.local automatically):
 *   bun documentation/notion-client-guide/publish-to-outline.ts
 *
 * Requires OUTLINE_KEY in .env.local (see .env.example).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { basename, join } from "path";
import { spawnSync } from "child_process";

const API = "https://outline.serving.cloud/api";
const DOC_ID = "258f2d90-aabf-4a0f-ba09-994669ce8ff3";
const ROOT = join(import.meta.dir);
const SHOTS = join(ROOT, "screenshots");
const OPTIMIZED = join(ROOT, ".outline-upload");
const KEY = process.env.OUTLINE_KEY?.trim();
if (!KEY) {
  console.error("Missing OUTLINE_KEY — add it to .env.local (see .env.example)");
  process.exit(1);
}

type ImageItem = {
  file: string;
  alt: string;
  section: string;
  heading: string;
  body: string;
};

const IMAGE_PLAN: ImageItem[] = [
  {
    file: "raw/01-sign-in.png",
    alt: "Sign in",
    section: "sign-in",
    heading: "1. Sign in",
    body: `1. Open the Review Room link you were given.
2. **Create your account** (register) with the email your team shared — even if production already set you up, you still complete this once.
3. Enter that email + password and click **Sign in**.

You land on **Projects** — only projects shared with you appear.`,
  },
  {
    file: "annotated/03-projects-list-annotated.png",
    alt: "Projects home",
    section: "projects",
    heading: "2. Projects home",
    body: `Only projects shared with you appear here. Click a project card to open the workspace.

**Tip:** The badge **Shared** means you are a reviewer on this project. If you have several projects, you will see multiple cards on this page.`,
  },
  {
    file: "annotated/04-project-workspace-root-annotated.png",
    alt: "Project overview",
    section: "overview",
    heading: "3. Project overview",
    body: `This is the full project workspace. Numbers on the image match:

1. **Left** — Projects, **Inbox**, smart folders, and date folders
2. **Top right** — **Access** and **Upload**
3. **Status cards** — Awaiting, Feedback, Selected, Approved
4. **Smart view tabs + toolbar** — filter the set; Grid / Group / Table / Review, Appearance, Search
5. **Main area** — folder cards or media cards

Open a smart folder or date folder to start reviewing.`,
  },
  {
    file: "annotated/14-upload-media-annotated.png",
    alt: "Upload media",
    section: "upload",
    heading: "4. Upload media",
    body: `Click **Upload** in the project header (overview **2**).

1. **Destination** — pick a folder. Use **DRIFT_References** (or your references folder) for reference stills, or today's date folder for new review media.
2. **Drop zone** — drop files here, or click to choose them.
3. **Asset type** — choose before uploading:
   - **Video** — motion clips
   - **Image** — single stills
   - **Contact sheet** — grids / sheets
   - **Storyboard** — storyboard frames`,
  },
  {
    file: "annotated/05-images-grid-annotated.png",
    alt: "Browse media",
    section: "browse",
    heading: "5. Browse media",
    body: `1. Click **Images** (or Videos / Contact sheets) under Smart folders.
2. **Click** a card to open the **details panel** on the right.
3. **Double-click** a still to open the **full-size view**.`,
  },
  {
    file: "annotated/06-appearance-controls-annotated.png",
    alt: "Appearance",
    section: "appearance",
    heading: "6. Appearance",
    body: `Open **Appearance** to change how the grid looks for you:

- **Card size** — S / M / L
- **Aspect ratio** — landscape / square / portrait
- **Thumbnail scale** — Fit or Fill
- **Show card info** — turn off to hide titles and badges under cards

These settings are saved for your browser on this workspace.`,
  },
  {
    file: "annotated/09-selected-view-annotated.png",
    alt: "Selected view",
    section: "selected",
    heading: "7. Selected (your shortlist)",
    body: `Click the **Selected** smart view tab to see only the assets you shortlisted.

To add something to Selected, open an asset and click **Shortlist** (bookmark) in the details panel.`,
  },
  {
    file: "annotated/11-has-feedback-view-annotated.png",
    alt: "Has Feedback",
    section: "feedback",
    heading: "8. Has Feedback",
    body: `Click **Has Feedback** to jump to assets that already have notes or comments.`,
  },
  {
    file: "annotated/07-image-selected-annotated.png",
    alt: "Rate, shortlist, comment",
    section: "details",
    heading: "9. Rate, shortlist, comment, and mark for delete",
    body: `After you click a card, the details panel opens on the right.

1. Rate with the **stars**, or click **Shortlist** (bookmark) to save a pick.
2. If you uploaded something by mistake, or want an asset removed, click **Mark for delete**. That flags it for the production team — they handle the actual delete. You cannot permanently delete media yourself.
3. Type in **Leave a note…**, then click **Add comment**.`,
  },
  {
    file: "annotated/15-mark-for-delete-annotated.png",
    alt: "Mark for delete",
    section: "mark-for-delete",
    heading: "9b. Mark for delete (client view)",
    body: `Click **Mark for delete** in the details panel. The card turns red with **MARKED FOR DELETE**.

- Click **Unmark** if you change your mind.
- Production (admins) see the flag and handle the real delete — clients do not get a permanent delete button.`,
  },
  {
    file: "annotated/12-video-details-comments-annotated.png",
    alt: "Video review",
    section: "video",
    heading: "10. Video review",
    body: `1. Scrub the **timeline** under the preview (number **1**) to find the moment you care about.
2. Optionally turn on **Pin to current time** (number **2**) so the note sticks to that timecode.
3. Type the note and click **Add comment**.`,
  },
  {
    file: "annotated/08-image-markup-lightbox-annotated.png",
    alt: "Markup",
    section: "markup",
    heading: "11. Draw-overs (stills)",
    body: `On stills (**IMG / CTX / STB**):

1. Hover a card and click **Markup**, or double-click the still for the full-size view and draw there.
2. Pick a **color** and **stroke thickness**, then draw.
3. Use **Undo** or **Clear** if needed.
4. Click **Save**.
5. You can also **rate with the stars** in the same toolbar.`,
  },
  {
    file: "annotated/10-table-view-annotated.png",
    alt: "Table view",
    section: "table",
    heading: "12. Table view",
    body: `Switch the toolbar to **Table** for a spreadsheet-style list (Shot, Status, Feedback, Rating, Updated, and more). Sort columns by clicking headers.`,
  },
  {
    file: "annotated/13-inbox-feedback-digest-annotated.png",
    alt: "Inbox",
    section: "inbox",
    heading: "13. Inbox",
    body: `Open **Inbox** from the left sidebar (number **1** on the image). It is the cross-project digest of review notes.

- Grouped by project and day
- Shows who wrote what, and on which asset
- **Needs attention** when something still needs follow-up
- **Mark handled** when you are done`,
  },
];

async function api(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

function optimizeImages() {
  mkdirSync(OPTIMIZED, { recursive: true });
  const py = join(ROOT, "..", ".venv", "Scripts", "python.exe");
  const helper = join(OPTIMIZED, "_optimize.py");
  writeFileSync(
    helper,
    `
from pathlib import Path
from PIL import Image

shots = Path(r${JSON.stringify(SHOTS)})
out = Path(r${JSON.stringify(OPTIMIZED)})
out.mkdir(parents=True, exist_ok=True)

files = ${JSON.stringify(IMAGE_PLAN.map((p) => p.file))}
for rel in files:
    src = shots / rel
    if not src.exists():
        print("missing", src)
        continue
    img = Image.open(src).convert("RGB")
    max_w = 1600
    if img.width > max_w:
        h = int(img.height * (max_w / img.width))
        img = img.resize((max_w, h), Image.Resampling.LANCZOS)
    dest = out / (Path(rel).stem + ".jpg")
    img.save(dest, "JPEG", quality=88, optimize=True)
    print(f"{dest.name} {dest.stat().st_size} {img.size}")
`,
  );
  const result = spawnSync(py, [helper], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error("image optimize failed");
  }
  console.log(result.stdout);
}

async function uploadAttachment(documentId: string, filePath: string, contentType: string) {
  const buf = readFileSync(filePath);
  const name = basename(filePath);
  const created = await api("/attachments.create", {
    name,
    contentType,
    size: buf.length,
    documentId,
  });
  const data = created.data;
  if (data.uploadUrl && data.form) {
    const form = new FormData();
    for (const [k, v] of Object.entries(data.form as Record<string, string>)) {
      form.append(k, v);
    }
    form.append("file", new Blob([buf], { type: contentType }), name);
    const up = await fetch(data.uploadUrl, { method: "POST", body: form });
    if (!up.ok) throw new Error(`upload failed ${name}: ${up.status} ${await up.text()}`);
  } else if (data.url) {
    const up = await fetch(data.url, {
      method: "PUT",
      headers: { ...(data.headers || {}), "Content-Type": contentType },
      body: buf,
    });
    if (!up.ok) throw new Error(`put failed ${name}: ${up.status} ${await up.text()}`);
  } else {
    throw new Error(`Unexpected attachment response: ${JSON.stringify(data)}`);
  }
  const attachmentId = data.attachment?.id || data.id;
  if (!attachmentId) throw new Error(`No attachment id for ${name}`);
  return attachmentId as string;
}

function buildMarkdown(ids: Record<string, string>) {
  const sections = IMAGE_PLAN.map((item) => {
    const id = ids[item.section];
    const image = id
      ? `\n\n![${item.alt}](/api/attachments.redirect?id=${id} "left-50")\n\n`
      : "\n\n";
    return `## ${item.heading}\n\n${item.body}${image}`;
  }).join("\n\n---\n\n");

  return `
This is the client / guest reviewer guide for **Review Room** (https://unfold-flower-gen.app).

Instructions are written as text so they stay searchable. Screenshots are tight crops of the control you need, with one teal box + arrow when a control needs pointing out.

---

## What clients can do

| Action | Client / guest | Admin |
|---|---|---|
| Browse folders + smart views | Yes | Yes |
| Rate / shortlist / comment | Yes | Yes |
| Draw markup on stills | Yes | Yes |
| **Upload media** (e.g. into References) | **Yes** | Yes |
| Create / rename / delete folders | No | Yes |
| Clear media / archive project | No | Yes |

### Upload references (quick)
1. Click **Upload** in the project header (or open a folder like \`DRIFT_References\` first, then Upload).
2. Confirm the **destination folder**.
3. Choose asset class if needed (**VID / IMG / CTX / STB**).
4. Drag/drop or pick files — watch progress — return to the workspace.

Clients cannot create folders — ask production for a new folder name, then upload into it.

---

${sections}

---

## Typical client loop

1. Register → Sign in → open shared project
2. **Upload** references into \`DRIFT_References\` (optional)
3. Browse Images / Videos / date folder
4. Click a card for the details panel (double-click a still for full-size)
5. Rate + Shortlist
6. Comment (pin time on video)
7. Markup stills and Save
8. Check Selected / Has Feedback / Inbox

---

## What clients cannot do

- Create / rename / move folders or covers
- Clear media / refresh previews / archive project
- Edit project identity / banner
- Change Access membership
`.trim();
}

async function main() {
  const annotate = spawnSync("bun", [join(ROOT, "annotate-ftrack.ts")], {
    encoding: "utf8",
    cwd: join(ROOT, "..", ".."),
  });
  if (annotate.status !== 0) {
    console.error(annotate.stdout, annotate.stderr);
    throw new Error("annotate-ftrack failed");
  }
  console.log(annotate.stdout);

  console.log("Optimizing images...");
  optimizeImages();

  console.log("Updating document", DOC_ID);
  const info = await api("/documents.info", { id: DOC_ID });
  const documentId = info.data.id as string;
  console.log("Doc", info.data.title, info.data.url);

  const ids: Record<string, string> = {};
  for (const item of IMAGE_PLAN) {
    const jpgName = `${basename(item.file, ".png")}.jpg`;
    const jpg = join(OPTIMIZED, jpgName);
    if (!existsSync(jpg)) {
      console.warn("skip missing optimized", jpg);
      continue;
    }
    console.log("Uploading", jpgName);
    ids[item.section] = await uploadAttachment(documentId, jpg, "image/jpeg");
  }

  await api("/documents.update", {
    id: documentId,
    title: "Review Room — Client How-To",
    text: buildMarkdown(ids),
    publish: true,
    fullWidth: true,
  });

  console.log("DONE", `https://outline.serving.cloud${info.data.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

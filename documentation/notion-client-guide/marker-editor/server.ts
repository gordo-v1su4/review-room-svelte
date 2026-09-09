/**
 * Local marker.js annotation studio for Review Room docs.
 *
 * bun documentation/notion-client-guide/marker-editor/server.ts
 * Then open http://127.0.0.1:4177
 *
 * Quality rules:
 * - Always annotate from screenshots/raw/*.png (never from JPG exports)
 * - Save marker state JSON under annotations/
 * - Export PNG at naturalSize into screenshots/annotated/
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join, basename, extname } from "path";

const ROOT = join(import.meta.dir, "..");
const SHOTS = join(ROOT, "screenshots");
const RAW = join(SHOTS, "raw");
const ANNOTATED = join(SHOTS, "annotated");
const ANNOTATIONS = join(ROOT, "annotations");
const EDITOR = import.meta.dir;
const UMD = join(process.cwd(), "node_modules", "@markerjs", "markerjs3", "umd", "markerjs3.js");
const PORT = Number(process.env.MARKER_EDITOR_PORT || 4177);

/** Only client-guide slides — keep dropdown order = Outline section order */
const GUIDE_SHOTS = [
  "01-sign-in.png",
  "03-projects-list.png",
  "04-project-workspace-root.png",
  "05-images-grid.png",
  "06-appearance-controls.png",
  "09-selected-view.png",
  "11-has-feedback-view.png",
  "07-image-selected.png",
  "12-video-details-comments.png",
  "08-image-markup-lightbox.png",
  "10-table-view.png",
  "13-inbox-feedback-digest.png",
];

mkdirSync(RAW, { recursive: true });
mkdirSync(ANNOTATED, { recursive: true });
mkdirSync(ANNOTATIONS, { recursive: true });

// Bootstrap raw/ from existing PNGs once (skip annotated + debug)
for (const name of readdirSync(SHOTS)) {
  if (!name.endsWith(".png")) continue;
  if (name.startsWith("_")) continue;
  const dest = join(RAW, name);
  if (!existsSync(dest)) {
    copyFileSync(join(SHOTS, name), dest);
    console.log("seeded raw/", name);
  }
}

function listGuideShots() {
  return GUIDE_SHOTS.filter((n) => existsSync(join(RAW, n)));
}

function statePathFor(shot: string) {
  return join(ANNOTATIONS, basename(shot, extname(shot)) + ".marker.json");
}

function annotatedPathFor(shot: string) {
  return join(ANNOTATED, basename(shot, extname(shot)) + "-annotated.png");
}

function mime(path: string) {
  if (path.endsWith(".js") || path.endsWith(".ts")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/shots") {
      const shots = listGuideShots().map((name) => ({
        name,
        stateExists: existsSync(statePathFor(name)),
        annotatedExists: existsSync(annotatedPathFor(name)),
      }));
      return Response.json({ shots });
    }

    if (url.pathname.startsWith("/api/state/") && req.method === "GET") {
      const name = decodeURIComponent(url.pathname.replace("/api/state/", ""));
      const path = statePathFor(name);
      if (!existsSync(path)) return Response.json({ state: null });
      return Response.json({ state: JSON.parse(readFileSync(path, "utf8")) });
    }

    if (url.pathname.startsWith("/api/state/") && req.method === "POST") {
      const name = decodeURIComponent(url.pathname.replace("/api/state/", ""));
      const body = (await req.json()) as { state: unknown };
      const path = statePathFor(name);
      writeFileSync(path, JSON.stringify(body.state, null, 2), "utf8");
      return Response.json({ ok: true, path: path.replace(ROOT + "\\", "").replace(ROOT + "/", "") });
    }

    if (url.pathname.startsWith("/api/export/") && req.method === "POST") {
      const name = decodeURIComponent(url.pathname.replace("/api/export/", ""));
      const body = (await req.json()) as { dataUrl: string };
      const m = /^data:image\/png;base64,(.+)$/.exec(body.dataUrl || "");
      if (!m) return new Response("expected png dataUrl", { status: 400 });
      const out = annotatedPathFor(name);
      writeFileSync(out, Buffer.from(m[1], "base64"));
      // Also persist state if provided alongside
      return Response.json({
        ok: true,
        path: out.replace(ROOT + "\\", "").replace(ROOT + "/", ""),
        bytes: Buffer.from(m[1], "base64").length,
      });
    }

    if (url.pathname.startsWith("/raw/")) {
      const name = decodeURIComponent(url.pathname.replace("/raw/", ""));
      const path = join(RAW, basename(name));
      if (!existsSync(path)) return new Response("missing", { status: 404 });
      return new Response(readFileSync(path), { headers: { "Content-Type": "image/png" } });
    }

    if (url.pathname === "/vendor/markerjs3.js") {
      if (!existsSync(UMD)) {
        return new Response("Install @markerjs/markerjs3 first", { status: 500 });
      }
      return new Response(readFileSync(UMD), {
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      });
    }

    // Static editor files. Browser TS is compiled on the fly.
    const file = url.pathname === "/" ? "/index.html" : url.pathname;
    const path = join(EDITOR, file.replace(/^\//, ""));
    if (!path.startsWith(EDITOR) || !existsSync(path)) {
      return new Response("not found", { status: 404 });
    }
    if (path.endsWith(".ts")) {
      const built = await Bun.build({
        entrypoints: [path],
        target: "browser",
      });
      if (!built.success || !built.outputs[0]) {
        return new Response(built.logs.join("\n"), { status: 500 });
      }
      return new Response(await built.outputs[0].text(), {
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      });
    }
    return new Response(readFileSync(path), { headers: { "Content-Type": mime(path) } });
  },
});

console.log(`marker.js editor → http://127.0.0.1:${server.port}`);
console.log(`raw shots: ${RAW}`);
console.log(`states:    ${ANNOTATIONS}`);
console.log(`exports:   ${ANNOTATED}`);

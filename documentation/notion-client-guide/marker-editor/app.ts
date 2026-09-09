type MarkerStyle = {
  text: string;
  strokeColor: string;
  fillColor: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
};

type MarkerLike = {
  typeName?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  color?: string;
  opacity?: number;
  text?: string;
  fontSize?: { value: number; units: string; step: number };
  adjustVisual?: () => void;
  constructor?: { typeName?: string; name?: string };
};

type MarkerState = {
  typeName?: string;
  text?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotationAngle?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  visualTransformMatrix?: Record<string, number>;
  containerTransformMatrix?: Record<string, number>;
};

type MarkerDoc = {
  version?: number;
  width?: number;
  height?: number;
  markers?: MarkerState[];
};

type MarkerAreaLike = HTMLElement & {
  targetImage: HTMLImageElement | null;
  defaultFilter: string;
  zoomLevel: number;
  autoZoomOut: boolean;
  autoZoomIn: boolean;
  editors?: Array<{ isSelected?: boolean; marker?: MarkerLike }>;
  autoZoom: () => void;
  createMarker: (type: string) => MarkerLike;
  getState: () => MarkerDoc;
  restoreState: (state: MarkerDoc) => void;
  undo?: () => void;
  deleteSelectedMarkers?: () => void;
};

type RendererLike = {
  targetImage: HTMLImageElement | null;
  naturalSize: boolean;
  imageType: string;
  rasterize: (state: MarkerDoc) => Promise<string>;
};

declare global {
  interface Window {
    markerjs3: {
      MarkerArea: new () => MarkerAreaLike;
      Renderer: new () => RendererLike;
    };
  }
}

const { MarkerArea, Renderer } = window.markerjs3;

const stage = requireEl<HTMLElement>("stage");
const shotSelect = requireEl<HTMLSelectElement>("shotSelect");
const statusEl = requireEl<HTMLElement>("status");
const zoomLabel = requireEl<HTMLElement>("zoomLabel");

let markerArea: MarkerAreaLike | null = null;
let targetImg: HTMLImageElement | null = null;
let currentShot = "";
let numberCounter = 1;

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function input(id: string): HTMLInputElement {
  return requireEl<HTMLInputElement>(id);
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function syncZoomUi() {
  const z = markerArea?.zoomLevel ?? 1;
  zoomLabel.textContent = `${Math.round(z * 100)}%`;
}

function fitShot() {
  if (!markerArea) return;
  markerArea.autoZoomOut = true;
  markerArea.autoZoomIn = false;
  markerArea.zoomLevel = 1;
  requestAnimationFrame(() => {
    if (!markerArea) return;
    markerArea.autoZoom();
    const imgH = targetImg?.naturalHeight || 1;
    const imgW = targetImg?.naturalWidth || 1;
    const stageH = stage.clientHeight || 1;
    const stageW = stage.clientWidth || 1;
    markerArea.zoomLevel = Math.min(stageW / imgW, stageH / imgH, 1);
    syncZoomUi();
  });
}

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function tealDefaults(): Omit<MarkerStyle, "text" | "fontSize"> {
  return {
    strokeColor: "#2dd4bf",
    strokeWidth: 3,
    fillColor: "#0d9488",
    color: "#ffffff",
    opacity: 0.8,
  };
}

function selectedEditor() {
  return markerArea?.editors?.find((editor) => editor.isSelected) ?? null;
}

function selectedMarker(): MarkerLike | null {
  return selectedEditor()?.marker ?? null;
}

function readStyleForm(): MarkerStyle {
  return {
    text: input("styleText").value,
    strokeColor: input("styleStroke").value,
    fillColor: input("styleFill").value,
    color: input("styleColor").value,
    strokeWidth: Number(input("styleWidth").value) || 3,
    opacity: Number(input("styleOpacity").value) || 1,
    fontSize: Number(input("styleFont").value) || 40,
  };
}

function applyStyleToMarker(marker: MarkerLike | null, style: Partial<MarkerStyle>) {
  if (!marker) return;
  if ("strokeColor" in marker && style.strokeColor !== undefined) {
    marker.strokeColor = style.strokeColor;
  }
  if ("strokeWidth" in marker && style.strokeWidth !== undefined) {
    marker.strokeWidth = style.strokeWidth;
  }
  if ("fillColor" in marker && style.fillColor !== undefined) {
    marker.fillColor = style.fillColor;
  }
  if ("color" in marker && style.color !== undefined) {
    marker.color = style.color;
  }
  if ("opacity" in marker && style.opacity !== undefined) {
    marker.opacity = style.opacity;
  }
  if ("text" in marker && style.text) {
    marker.text = style.text;
  }
  if ("fontSize" in marker && style.fontSize !== undefined) {
    marker.fontSize = { value: style.fontSize, units: "px", step: 1 };
  }
  marker.adjustVisual?.();
}

function pullStyleFromSelection() {
  const marker = selectedMarker();
  if (!marker) return;
  if ("text" in marker) input("styleText").value = marker.text ?? "";
  if (marker.strokeColor) input("styleStroke").value = toHex(marker.strokeColor);
  if (marker.fillColor) input("styleFill").value = toHex(marker.fillColor);
  if (marker.color) input("styleColor").value = toHex(marker.color);
  if (marker.strokeWidth != null) input("styleWidth").value = String(marker.strokeWidth);
  if (marker.opacity != null) {
    input("styleOpacity").value = String(marker.opacity);
    requireEl("opacityVal").textContent = `${Math.round(marker.opacity * 100)}%`;
  }
  if (marker.fontSize?.value != null) {
    input("styleFont").value = String(marker.fontSize.value);
  }
}

function toHex(color: string) {
  if (color.startsWith("#") && color.length === 7) return color;
  if (color === "black") return "#000000";
  if (color === "white") return "#ffffff";
  return "#2dd4bf";
}

async function loadShot(name: string, { autosavePrevious = true } = {}) {
  if (autosavePrevious && markerArea && currentShot) {
    try {
      const state = markerArea.getState();
      await api(`/api/state/${encodeURIComponent(currentShot)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
    } catch (err) {
      console.warn("autosave failed", err);
    }
  }
  currentShot = name;
  setStatus(`Loading ${name}…`);
  stage.innerHTML = "";
  const image = document.createElement("img");
  image.alt = name;
  image.decoding = "async";
  targetImg = image;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("failed to load image"));
    image.src = `/raw/${encodeURIComponent(name)}`;
  });

  markerArea = new MarkerArea();
  markerArea.targetImage = image;
  markerArea.defaultFilter = "url(#dropShadow)";
  stage.appendChild(markerArea);

  markerArea.addEventListener("markerselect", () => pullStyleFromSelection());
  markerArea.addEventListener("markerchange", () => pullStyleFromSelection());

  const { state } = await api<{ state: MarkerDoc | null }>(
    `/api/state/${encodeURIComponent(name)}`,
  );
  if (state) {
    markerArea.restoreState(state);
    numberCounter = nextNumberFromState(state);
    setStatus(
      `${name}  ·  ${image.naturalWidth}×${image.naturalHeight}  ·  restored ${state.markers?.length || 0} markers`,
    );
  } else {
    numberCounter = 1;
    setStatus(`${name}  ·  ${image.naturalWidth}×${image.naturalHeight}  ·  empty`);
  }
  fitShot();
}

function nextNumberFromState(state: MarkerDoc) {
  let max = 0;
  for (const marker of state.markers || []) {
    const hit = String(marker.text || "").match(/^(\d+)/);
    if (hit?.[1]) max = Math.max(max, Number(hit[1]));
  }
  return max + 1;
}

async function init() {
  const { shots } = await api<{
    shots: Array<{ name: string; stateExists: boolean }>;
  }>("/api/shots");
  shotSelect.innerHTML = "";
  for (const shot of shots) {
    const opt = document.createElement("option");
    opt.value = shot.name;
    opt.textContent = shot.name + (shot.stateExists ? " ●" : "");
    shotSelect.appendChild(opt);
  }
  const preferred =
    shots.find((shot) => shot.name.includes("appearance"))?.name || shots[0]?.name;
  if (!preferred) {
    setStatus("No PNGs in screenshots/raw/");
    return;
  }
  shotSelect.value = preferred;
  await loadShot(preferred);
  updateShotMeta();
  shotSelect.addEventListener("change", updateShotMeta);
}

shotSelect.addEventListener("change", () => {
  void loadShot(shotSelect.value);
});

function updateShotMeta() {
  const total = shotSelect.options.length;
  const meta = document.getElementById("shotMeta");
  if (meta) {
    meta.textContent = total ? `Slide ${shotSelect.selectedIndex + 1} of ${total}` : "";
  }
}

requireEl("btnPrev").addEventListener("click", () => {
  if (shotSelect.selectedIndex > 0) {
    shotSelect.selectedIndex -= 1;
    void loadShot(shotSelect.value).then(updateShotMeta);
  }
});

requireEl("btnNext").addEventListener("click", () => {
  if (shotSelect.selectedIndex < shotSelect.options.length - 1) {
    shotSelect.selectedIndex += 1;
    void loadShot(shotSelect.value).then(updateShotMeta);
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  ) {
    return;
  }
  if (event.key === "ArrowLeft") requireEl("btnPrev").click();
  if (event.key === "ArrowRight") requireEl("btnNext").click();
});

document.querySelectorAll<HTMLButtonElement>("#tools [data-marker]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!markerArea) return;
    document.querySelectorAll("#tools button").forEach((other) => {
      other.classList.remove("active");
    });
    btn.classList.add("active");
    const type = btn.getAttribute("data-marker");
    if (!type) return;
    const marker = markerArea.createMarker(type);
    applyStyleToMarker(marker, {
      ...tealDefaults(),
      ...readStyleForm(),
      text: input("styleText").value,
    });
    if (type === "CaptionFrameMarker" && !input("styleText").value) {
      marker.text = "Label";
    }
    if (type === "CoverMarker") {
      marker.fillColor = "#000000";
      marker.opacity = 0.55;
      marker.strokeWidth = 0;
      marker.strokeColor = "transparent";
    }
    setStatus(`Placing ${type}`);
  });
});

document
  .querySelector<HTMLButtonElement>('#tools [data-action="number"]')
  ?.addEventListener("click", () => {
    if (!markerArea) return;
    const marker = markerArea.createMarker("TextMarker");
    const n = String(numberCounter++);
    input("styleText").value = n;
    applyStyleToMarker(marker, {
      ...tealDefaults(),
      color: "#2dd4bf",
      strokeWidth: 0,
      fontSize: 32,
      text: n,
    });
    setStatus(`Number badge ${n} — drag it to the arrow base`);
  });

requireEl("btnApplyStyle").addEventListener("click", () => {
  const marker = selectedMarker();
  if (!marker) {
    setStatus("Select a marker first");
    return;
  }
  applyStyleToMarker(marker, readStyleForm());
  setStatus("Style applied");
});

input("styleOpacity").addEventListener("input", () => {
  requireEl("opacityVal").textContent = `${Math.round(Number(input("styleOpacity").value) * 100)}%`;
});

requireEl("btnDimOutside").addEventListener("click", () => {
  if (!markerArea || !targetImg) return;
  const marker = selectedMarker();
  const typeName = String(marker?.typeName || marker?.constructor?.typeName || "");
  const ctorName = String(marker?.constructor?.name || "");
  const ok =
    marker &&
    marker.left != null &&
    marker.width != null &&
    (typeName.includes("Frame") || ctorName.includes("Frame"));
  if (!ok || !marker) {
    setStatus("Select a Caption frame (or Frame) first, then Dim outside");
    return;
  }
  const imageWidth = targetImg.naturalWidth;
  const imageHeight = targetImg.naturalHeight;
  const x = marker.left ?? 0;
  const y = marker.top ?? 0;
  const w = marker.width ?? 0;
  const h = marker.height ?? 0;
  const pads = [
    { left: 0, top: 0, width: imageWidth, height: Math.max(0, y) },
    { left: 0, top: y + h, width: imageWidth, height: Math.max(0, imageHeight - (y + h)) },
    { left: 0, top: y, width: Math.max(0, x), height: h },
    { left: x + w, top: y, width: Math.max(0, imageWidth - (x + w)), height: h },
  ];
  const state = markerArea.getState();
  const covers = pads
    .filter((pad) => pad.width > 2 && pad.height > 2)
    .map((pad) => ({
      typeName: "CoverMarker",
      left: pad.left,
      top: pad.top,
      width: pad.width,
      height: pad.height,
      rotationAngle: 0,
      fillColor: "#000000",
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 0.58,
      visualTransformMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      containerTransformMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    }));
  const kept = (state.markers || []).filter((item) => item.typeName !== "CoverMarker");
  markerArea.restoreState({
    ...state,
    markers: [...covers, ...kept],
  });
  setStatus(`Added dim around frame (${covers.length} panels, 58% opacity)`);
});

requireEl("btnUndo").addEventListener("click", () => markerArea?.undo?.());
requireEl("btnDelete").addEventListener("click", () => markerArea?.deleteSelectedMarkers?.());
requireEl("btnClear").addEventListener("click", () => {
  if (!markerArea || !targetImg || !confirm("Clear all markers?")) return;
  markerArea.restoreState({
    version: 3,
    width: targetImg.naturalWidth,
    height: targetImg.naturalHeight,
    markers: [],
  });
  numberCounter = 1;
  setStatus("Cleared");
});

requireEl("btnZoomIn").addEventListener("click", () => {
  if (!markerArea) return;
  markerArea.zoomLevel = Math.min(2.5, (markerArea.zoomLevel || 1) + 0.1);
  syncZoomUi();
});
requireEl("btnZoomOut").addEventListener("click", () => {
  if (!markerArea) return;
  markerArea.zoomLevel = Math.max(0.15, (markerArea.zoomLevel || 1) - 0.1);
  syncZoomUi();
});
requireEl("btnZoomFit").addEventListener("click", () => fitShot());

window.addEventListener("resize", () => fitShot());

requireEl("btnSave").addEventListener("click", async () => {
  if (!markerArea || !currentShot) return;
  const state = markerArea.getState();
  const res = await api<{ path: string }>(`/api/state/${encodeURIComponent(currentShot)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  setStatus(`Saved → ${res.path}`);
});

requireEl("btnExport").addEventListener("click", async () => {
  if (!markerArea || !targetImg || !currentShot) return;
  setStatus("Exporting natural-size PNG…");
  const state = markerArea.getState();
  await api(`/api/state/${encodeURIComponent(currentShot)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  const renderer = new Renderer();
  renderer.targetImage = targetImg;
  renderer.naturalSize = true;
  renderer.imageType = "image/png";
  const dataUrl = await renderer.rasterize(state);
  const res = await api<{ bytes: number; path: string }>(
    `/api/export/${encodeURIComponent(currentShot)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    },
  );
  setStatus(`Exported PNG (${res.bytes.toLocaleString()} bytes) → ${res.path}`);
});

void init().catch((err: unknown) => {
  console.error(err);
  setStatus(String(err));
});

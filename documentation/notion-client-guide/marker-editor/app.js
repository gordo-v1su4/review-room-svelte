const { MarkerArea, Renderer } = window.markerjs3;

const stage = document.getElementById("stage");
const shotSelect = document.getElementById("shotSelect");
const statusEl = document.getElementById("status");
const zoomLabel = document.getElementById("zoomLabel");

/** @type {InstanceType<typeof MarkerArea> | null} */
let markerArea = null;
/** @type {HTMLImageElement | null} */
let targetImg = null;
let currentShot = "";
let numberCounter = 1;

const $ = (id) => document.getElementById(id);

function setStatus(msg) {
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
  // Let layout settle, then fit full screenshot in the stage
  requestAnimationFrame(() => {
    markerArea.autoZoom();
    // If still overflowing height, scale by height too
    const z = markerArea.zoomLevel || 1;
    const imgH = targetImg?.naturalHeight || 1;
    const imgW = targetImg?.naturalWidth || 1;
    const stageH = stage.clientHeight || 1;
    const stageW = stage.clientWidth || 1;
    const fit = Math.min(stageW / imgW, stageH / imgH, 1);
    markerArea.zoomLevel = fit;
    syncZoomUi();
  });
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

function tealDefaults() {
  return {
    strokeColor: "#2dd4bf",
    strokeWidth: 3,
    fillColor: "#0d9488",
    color: "#ffffff",
    opacity: 0.8,
  };
}

function selectedEditor() {
  return markerArea?.editors?.find((e) => e.isSelected) || null;
}

function selectedMarker() {
  return selectedEditor()?.marker || null;
}

function readStyleForm() {
  return {
    text: $("styleText").value,
    strokeColor: $("styleStroke").value,
    fillColor: $("styleFill").value,
    color: $("styleColor").value,
    strokeWidth: Number($("styleWidth").value) || 3,
    opacity: Number($("styleOpacity").value) || 1,
    fontSize: Number($("styleFont").value) || 40,
  };
}

function applyStyleToMarker(marker, style) {
  if (!marker) return;
  if ("strokeColor" in marker) marker.strokeColor = style.strokeColor;
  if ("strokeWidth" in marker) marker.strokeWidth = style.strokeWidth;
  if ("fillColor" in marker) marker.fillColor = style.fillColor;
  if ("color" in marker) marker.color = style.color;
  if ("opacity" in marker) marker.opacity = style.opacity;
  if ("text" in marker && style.text !== undefined && style.text !== "") {
    marker.text = style.text;
  }
  if ("fontSize" in marker) {
    marker.fontSize = { value: style.fontSize, units: "px", step: 1 };
  }
  marker.adjustVisual?.();
}

function pullStyleFromSelection() {
  const marker = selectedMarker();
  if (!marker) return;
  if ("text" in marker) $("styleText").value = marker.text ?? "";
  if ("strokeColor" in marker && marker.strokeColor) $("styleStroke").value = toHex(marker.strokeColor);
  if ("fillColor" in marker && marker.fillColor) $("styleFill").value = toHex(marker.fillColor);
  if ("color" in marker && marker.color) $("styleColor").value = toHex(marker.color);
  if ("strokeWidth" in marker && marker.strokeWidth != null) $("styleWidth").value = String(marker.strokeWidth);
  if ("opacity" in marker && marker.opacity != null) {
    $("styleOpacity").value = String(marker.opacity);
    $("opacityVal").textContent = `${Math.round(marker.opacity * 100)}%`;
  }
  if ("fontSize" in marker && marker.fontSize?.value != null) {
    $("styleFont").value = String(marker.fontSize.value);
  }
}

function toHex(c) {
  if (!c) return "#2dd4bf";
  if (c.startsWith("#") && c.length === 7) return c;
  // named / rgb fallbacks
  if (c === "black") return "#000000";
  if (c === "white") return "#ffffff";
  return "#2dd4bf";
}

async function loadShot(name, { autosavePrevious = true } = {}) {
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
  targetImg = document.createElement("img");
  targetImg.alt = name;
  targetImg.decoding = "async";

  await new Promise((resolve, reject) => {
    targetImg.onload = () => resolve();
    targetImg.onerror = () => reject(new Error("failed to load image"));
    targetImg.src = `/raw/${encodeURIComponent(name)}`;
  });

  markerArea = new MarkerArea();
  markerArea.targetImage = targetImg;
  markerArea.defaultFilter = "url(#dropShadow)";
  stage.appendChild(markerArea);

  markerArea.addEventListener("markerselect", () => pullStyleFromSelection());
  markerArea.addEventListener("markerchange", () => pullStyleFromSelection());

  const { state } = await api(`/api/state/${encodeURIComponent(name)}`);
  if (state) {
    markerArea.restoreState(state);
    numberCounter = nextNumberFromState(state);
    setStatus(
      `${name}  ·  ${targetImg.naturalWidth}×${targetImg.naturalHeight}  ·  restored ${state.markers?.length || 0} markers`,
    );
  } else {
    numberCounter = 1;
    setStatus(`${name}  ·  ${targetImg.naturalWidth}×${targetImg.naturalHeight}  ·  empty`);
  }
  fitShot();
}

function nextNumberFromState(state) {
  let max = 0;
  for (const m of state.markers || []) {
    const t = String(m.text || "");
    const hit = t.match(/^(\d+)/);
    if (hit) max = Math.max(max, Number(hit[1]));
  }
  return max + 1;
}

async function init() {
  const { shots } = await api("/api/shots");
  shotSelect.innerHTML = "";
  for (const s of shots) {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name + (s.stateExists ? " ●" : "");
    shotSelect.appendChild(opt);
  }
  const preferred =
    shots.find((s) => s.name.includes("appearance"))?.name || shots[0]?.name;
  if (!preferred) {
    setStatus("No PNGs in screenshots/raw/");
    return;
  }
  shotSelect.value = preferred;
  await loadShot(preferred);
  updateShotMeta();
  shotSelect.addEventListener("change", updateShotMeta);
}

shotSelect.addEventListener("change", () => loadShot(shotSelect.value));

function updateShotMeta() {
  const i = shotSelect.selectedIndex;
  const total = shotSelect.options.length;
  const meta = document.getElementById("shotMeta");
  if (meta) meta.textContent = total ? `Slide ${i + 1} of ${total}` : "";
}

document.getElementById("btnPrev").addEventListener("click", () => {
  if (shotSelect.selectedIndex > 0) {
    shotSelect.selectedIndex -= 1;
    loadShot(shotSelect.value).then(updateShotMeta);
  }
});

document.getElementById("btnNext").addEventListener("click", () => {
  if (shotSelect.selectedIndex < shotSelect.options.length - 1) {
    shotSelect.selectedIndex += 1;
    loadShot(shotSelect.value).then(updateShotMeta);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (e.key === "ArrowLeft") document.getElementById("btnPrev").click();
  if (e.key === "ArrowRight") document.getElementById("btnNext").click();
});

document.querySelectorAll("#tools [data-marker]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!markerArea) return;
    document.querySelectorAll("#tools button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const type = btn.getAttribute("data-marker");
    const marker = markerArea.createMarker(type);
    applyStyleToMarker(marker, { ...tealDefaults(), ...readStyleForm(), text: $("styleText").value });
    if (type === "CaptionFrameMarker" && !($("styleText").value)) marker.text = "Label";
    if (type === "CoverMarker") {
      marker.fillColor = "#000000";
      marker.opacity = 0.55;
      marker.strokeWidth = 0;
      marker.strokeColor = "transparent";
    }
    setStatus(`Placing ${type}`);
  });
});

document.querySelector('#tools [data-action="number"]').addEventListener("click", () => {
  if (!markerArea) return;
  const marker = markerArea.createMarker("TextMarker");
  const n = String(numberCounter++);
  $("styleText").value = n;
  applyStyleToMarker(marker, {
    ...tealDefaults(),
    color: "#2dd4bf",
    strokeWidth: 0,
    fontSize: 32,
    text: n,
  });
  setStatus(`Number badge ${n} — drag it to the arrow base`);
});

$("btnApplyStyle").addEventListener("click", () => {
  const marker = selectedMarker();
  if (!marker) {
    setStatus("Select a marker first");
    return;
  }
  applyStyleToMarker(marker, readStyleForm());
  setStatus("Style applied");
});

$("styleOpacity").addEventListener("input", () => {
  $("opacityVal").textContent = `${Math.round(Number($("styleOpacity").value) * 100)}%`;
});

$("btnDimOutside").addEventListener("click", () => {
  if (!markerArea || !targetImg) return;
  const marker = selectedMarker();
  if (!marker || marker.typeName !== "CaptionFrameMarker" && marker.constructor?.typeName !== "CaptionFrameMarker") {
    // also accept FrameMarker
    const ok =
      marker &&
      ("left" in marker) &&
      ("width" in marker) &&
      (String(marker.typeName || marker.constructor?.typeName || "").includes("Frame") ||
        String(marker.constructor?.name || "").includes("Frame"));
    if (!ok) {
      setStatus("Select a Caption frame (or Frame) first, then Dim outside");
      return;
    }
  }
  const W = targetImg.naturalWidth;
  const H = targetImg.naturalHeight;
  const x = marker.left;
  const y = marker.top;
  const w = marker.width;
  const h = marker.height;
  const pads = [
    { left: 0, top: 0, width: W, height: Math.max(0, y) },
    { left: 0, top: y + h, width: W, height: Math.max(0, H - (y + h)) },
    { left: 0, top: y, width: Math.max(0, x), height: h },
    { left: x + w, top: y, width: Math.max(0, W - (x + w)), height: h },
  ];
  // Restore full state with covers inserted behind (first in array = under)
  const state = markerArea.getState();
  const covers = pads
    .filter((p) => p.width > 2 && p.height > 2)
    .map((p) => ({
      typeName: "CoverMarker",
      left: p.left,
      top: p.top,
      width: p.width,
      height: p.height,
      rotationAngle: 0,
      fillColor: "#000000",
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 0.58,
      visualTransformMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      containerTransformMatrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    }));
  // Drop previous auto-dim covers (black full-panel covers)
  const kept = (state.markers || []).filter((m) => m.typeName !== "CoverMarker");
  markerArea.restoreState({
    ...state,
    markers: [...covers, ...kept],
  });
  setStatus(`Added dim around frame (${covers.length} panels, 58% opacity)`);
});

$("btnUndo").addEventListener("click", () => markerArea?.undo?.());
$("btnDelete").addEventListener("click", () => markerArea?.deleteSelectedMarkers?.());
$("btnClear").addEventListener("click", () => {
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

$("btnZoomIn").addEventListener("click", () => {
  if (!markerArea) return;
  markerArea.zoomLevel = Math.min(2.5, (markerArea.zoomLevel || 1) + 0.1);
  syncZoomUi();
});
$("btnZoomOut").addEventListener("click", () => {
  if (!markerArea) return;
  markerArea.zoomLevel = Math.max(0.15, (markerArea.zoomLevel || 1) - 0.1);
  syncZoomUi();
});
$("btnZoomFit").addEventListener("click", () => fitShot());

window.addEventListener("resize", () => fitShot());

$("btnSave").addEventListener("click", async () => {
  if (!markerArea || !currentShot) return;
  const state = markerArea.getState();
  const res = await api(`/api/state/${encodeURIComponent(currentShot)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  setStatus(`Saved → ${res.path}`);
});

$("btnExport").addEventListener("click", async () => {
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
  const res = await api(`/api/export/${encodeURIComponent(currentShot)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  setStatus(`Exported PNG (${res.bytes.toLocaleString()} bytes) → ${res.path}`);
});

init().catch((err) => {
  console.error(err);
  setStatus(String(err));
});

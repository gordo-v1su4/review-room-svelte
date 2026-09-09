import type { Layout } from "react-resizable-panels";

export type WorkspacePanelState = {
  viewerOpen: boolean;
  infoOpen: boolean;
  layout: Layout;
};

const DEFAULT_LAYOUT: Layout = {
  assets: 28,
  viewer: 40,
  inspector: 32,
};

const MIN_INSPECTOR = 20;
const MIN_ASSETS = 18;
const MIN_VIEWER = 20;

function roundSize(value: number) {
  return Math.round(value * 10) / 10;
}

export function normalizeLayout(
  layout: Partial<Layout>,
  visible: { viewerOpen?: boolean; infoOpen?: boolean } = {},
): Layout {
  const viewerOpen = visible.viewerOpen ?? true;
  const infoOpen = visible.infoOpen ?? true;

  let assets = Number(layout.assets ?? DEFAULT_LAYOUT.assets);
  let viewer = Number(layout.viewer ?? DEFAULT_LAYOUT.viewer);
  let inspector = Number(layout.inspector ?? DEFAULT_LAYOUT.inspector);

  const parts: Array<{
    assign: (value: number) => void;
    value: number;
    min: number;
    max: number;
  }> = [
    {
      assign: (value) => {
        assets = value;
      },
      value: assets,
      min: MIN_ASSETS,
      max: viewerOpen || infoOpen ? 80 : 100,
    },
  ];
  if (viewerOpen) {
    parts.push({
      assign: (value) => {
        viewer = value;
      },
      value: viewer,
      min: MIN_VIEWER,
      max: 55,
    });
  }
  if (infoOpen) {
    parts.push({
      assign: (value) => {
        inspector = value;
      },
      value: inspector,
      min: MIN_INSPECTOR,
      max: 48,
    });
  }

  for (const part of parts) {
    part.value = Math.max(part.min, Math.min(part.max, part.value));
  }
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total <= 0) return DEFAULT_LAYOUT;
  for (const part of parts) {
    part.assign(roundSize((part.value / total) * 100));
  }

  return {
    assets,
    viewer,
    inspector,
  };
}

export function layoutForVisible(
  layout: Layout,
  viewerOpen: boolean,
  infoOpen: boolean,
): Layout {
  const next: Layout = { assets: layout.assets ?? DEFAULT_LAYOUT.assets };
  if (viewerOpen) next.viewer = layout.viewer ?? DEFAULT_LAYOUT.viewer;
  if (infoOpen) next.inspector = layout.inspector ?? DEFAULT_LAYOUT.inspector;

  const total = Object.values(next).reduce((sum, value) => sum + Number(value), 0);
  if (total <= 0) return { assets: 100 };

  const scaled: Layout = {};
  for (const [key, value] of Object.entries(next)) {
    scaled[key] = roundSize((Number(value) / total) * 100);
  }
  return scaled;
}

const DEFAULT_STATE: WorkspacePanelState = {
  viewerOpen: true,
  infoOpen: true,
  layout: DEFAULT_LAYOUT,
};

function storageKey(projectId: string) {
  return `rr:workspace:${projectId}`;
}

export function loadWorkspacePanelState(projectId: string): WorkspacePanelState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WorkspacePanelState>;
    return {
      viewerOpen: parsed.viewerOpen ?? DEFAULT_STATE.viewerOpen,
      infoOpen: parsed.infoOpen ?? DEFAULT_STATE.infoOpen,
      layout: normalizeLayout({
        ...DEFAULT_LAYOUT,
        ...parsed.layout,
      }),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveWorkspacePanelState(
  projectId: string,
  state: WorkspacePanelState,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(projectId),
    JSON.stringify({
      ...state,
      layout: normalizeLayout(state.layout, {
        viewerOpen: state.viewerOpen,
        infoOpen: state.infoOpen,
      }),
    }),
  );
}

export { DEFAULT_LAYOUT, normalizeLayout };

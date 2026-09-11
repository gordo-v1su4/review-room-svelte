import type { Layout } from "react-resizable-panels";

/** Shared horizontal inset for project workspace chrome (hero, toolbar, grids, review). */
export const WORKSPACE_CHROME_PADDING = "px-3 sm:px-6 lg:px-8";
export const WORKSPACE_CHROME_MARGIN = "mx-3 sm:mx-6 lg:mx-8";
export const WORKSPACE_CHROME_INSET = "p-3 sm:p-6 lg:p-8";

export type WorkspacePanelState = {
  viewerOpen: boolean;
  infoOpen: boolean;
  layout: Layout;
};

/** Viewer + grid, opened via toolbar toggle — 50/50. */
export const VIEWER_HALF_LAYOUT: Layout = {
  assets: 50,
  viewer: 50,
};

/** Viewer + grid, opened via double-click — wider viewer. */
export const VIEWER_EXPANDED_LAYOUT: Layout = {
  assets: 36,
  viewer: 64,
};

/** Grid + viewer + info — balanced thirds. */
export const ALL_HALF_LAYOUT: Layout = {
  assets: 34,
  viewer: 33,
  inspector: 33,
};

/** Grid + viewer + info — wider viewer for focus playback. */
export const ALL_EXPANDED_LAYOUT: Layout = {
  assets: 26,
  viewer: 44,
  inspector: 30,
};

const DEFAULT_LAYOUT: Layout = VIEWER_HALF_LAYOUT;

const MIN_INSPECTOR = 20;
const MIN_ASSETS = 18;
const MIN_VIEWER = 20;
const MAX_VIEWER = 68;

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
      max: MAX_VIEWER,
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

export function layoutPreset(options: {
  viewerOpen: boolean;
  infoOpen: boolean;
  expanded?: boolean;
}): Layout {
  const { viewerOpen, infoOpen, expanded = false } = options;
  if (!viewerOpen && !infoOpen) return { assets: 100 };
  if (viewerOpen && infoOpen) {
    return expanded ? ALL_EXPANDED_LAYOUT : ALL_HALF_LAYOUT;
  }
  if (viewerOpen) {
    return expanded ? VIEWER_EXPANDED_LAYOUT : VIEWER_HALF_LAYOUT;
  }
  return { assets: 50, inspector: 50 };
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
  viewerOpen: false,
  infoOpen: false,
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

export { DEFAULT_LAYOUT };

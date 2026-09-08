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

function normalizeLayout(layout: Partial<Layout>): Layout {
  let assets = layout.assets ?? DEFAULT_LAYOUT.assets;
  let viewer = layout.viewer ?? DEFAULT_LAYOUT.viewer;
  let inspector = layout.inspector ?? DEFAULT_LAYOUT.inspector;

  assets = Math.max(MIN_ASSETS, Math.min(50, assets));
  viewer = Math.max(MIN_VIEWER, Math.min(55, viewer));
  inspector = Math.max(MIN_INSPECTOR, Math.min(48, inspector));

  const total = assets + viewer + inspector;
  if (total <= 0) return DEFAULT_LAYOUT;

  assets = (assets / total) * 100;
  viewer = (viewer / total) * 100;
  inspector = (inspector / total) * 100;

  return {
    assets: Math.round(assets * 10) / 10,
    viewer: Math.round(viewer * 10) / 10,
    inspector: Math.round(inspector * 10) / 10,
  };
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
      layout: normalizeLayout(state.layout),
    }),
  );
}

export { DEFAULT_LAYOUT, normalizeLayout };

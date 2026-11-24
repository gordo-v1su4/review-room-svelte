import { acceptsProcessingUpdate, type ProcessingUpdate } from './processing';

/**
 * Live refresh of the open owner workspace: what another app (Creative Studio Pro) or another tab changed is merged
 * into what is already on screen, without a reload. The rules here are pure; the page applies their result.
 */

/** One take as the workspace lists it. */
export type LiveVersion = {
  id: string; assetId: string; version: number; processingState: string; hasPoster: boolean; hasSprite?: boolean;
  sizeBytes: number; mimeType: string; excluded: boolean; metadata: unknown; metadataUpdatedAt: number | null;
};
/** One changed asset: its review state and what its current version (the pick) now is. */
export type LiveAsset = {
  id: string; projectId: string; folderId: string | null; name: string; assetCode: string; originalFilename: string;
  mimeType: string; sizeBytes: number; importedAt: number; misfiled: boolean; tags: string[];
  status: string; rating: number; shortlisted: boolean; viewed: boolean; processing: ProcessingUpdate;
};
/** One project's changes since a cursor. Rows near the cursor repeat, so every part is applied as an upsert. */
export type LiveChanges = {
  cursor: string; assets: LiveAsset[]; versions: LiveVersion[]; removedAssetIds: string[];
  /** Every asset in the project; sent only when the workspace holds a different number of them. */
  assetIds?: string[];
};

/** Where to start reading: the newest change the loaded snapshot already holds for a project. */
export function liveCursor(assets: readonly { updatedAt: number; versionsUpdatedAt?: number }[]) {
  return assets.reduce((newest, asset) => Math.max(newest, asset.updatedAt, asset.versionsUpdatedAt ?? 0), 0);
}

export type PickView = {
  /** The pick as last reported by the server. */
  current: ProcessingUpdate;
  displayedVersionId: string | null;
  /** The operator chose a take for this asset instead of following its current version. */
  pinned: boolean;
  /** The displayed take has details that are unsaved or being saved. */
  unsaved: boolean;
};

/**
 * What happens to one asset when the server reports its pick. `null`: the report is stale and ignored.
 * Otherwise the report becomes the known pick (the current mark moves) and:
 * - `follow`: the picture moves to the reported take. It does when the operator never chose a take, or was looking
 *   at the pick when it changed. A take chosen on purpose that is not the pick stays, and so does a take with
 *   unsaved details.
 * - `clearOverride`: a locally applied "Make current" mark gives way to the report. A report that only repeats the
 *   known pick may predate that click, so it clears the mark only when `settled` (read after every local write).
 */
export function receivePick(view: PickView, update: ProcessingUpdate, settled = false): { follow: boolean; clearOverride: boolean } | null {
  if (!acceptsProcessingUpdate(view.current, update)) return null;
  const changed = update.versionId !== view.current.versionId;
  const lookingAtPick = view.displayedVersionId === view.current.versionId;
  return {
    follow: view.displayedVersionId !== update.versionId && !view.unsaved && (!view.pinned || (changed && lookingAtPick)),
    clearOverride: settled || changed,
  };
}

export type LiveHeld = {
  /** The project that was read; assets of other projects are never touched. */
  projectId: string;
  assets: readonly { id: string; projectId: string; displayedVersionId: string | null }[];
  versions: readonly LiveVersion[];
  /** Takes whose details are unsaved or being saved. */
  unsaved: ReadonlySet<string>;
};
export type LivePlan = {
  /** Every known take after the merge. */
  versions: LiveVersion[];
  /** Assets the workspace does not hold yet. */
  added: LiveAsset[];
  /** Held assets with fresh review state; each one's pick goes through `receivePick`. */
  updated: LiveAsset[];
  /** Held assets that no longer exist. */
  removed: string[];
  /** Takes on screen whose details changed elsewhere and replace what is shown. */
  details: LiveVersion[];
};

/** Merge one project's changes into what the workspace holds. */
export function planLiveRefresh(held: LiveHeld, changes: LiveChanges): LivePlan {
  const mine = held.assets.filter(asset => asset.projectId === held.projectId);
  const heldIds = new Set(mine.map(asset => asset.id));
  const gone = new Set(changes.removedAssetIds);
  if (changes.assetIds) {
    const present = new Set(changes.assetIds);
    for (const asset of mine) if (!present.has(asset.id)) gone.add(asset.id);
  }
  // Rows arrive oldest first and may repeat; the last one for an asset is the newest.
  const rows = new Map<string, LiveAsset>();
  for (const asset of changes.assets) if (!gone.has(asset.id)) { rows.delete(asset.id); rows.set(asset.id, asset); }
  const incoming = new Map(changes.versions.filter(version => !gone.has(version.assetId)).map(version => [version.id, version]));
  const known = new Map(held.versions.map(version => [version.id, version]));
  const versions = held.versions.filter(version => !gone.has(version.assetId)).map(version => incoming.get(version.id) ?? version);
  for (const version of incoming.values()) if (!known.has(version.id)) versions.push(version);
  const shown = new Set(mine.filter(asset => !gone.has(asset.id)).map(asset => asset.displayedVersionId));
  return {
    versions,
    added: [...rows.values()].filter(asset => !heldIds.has(asset.id)),
    updated: [...rows.values()].filter(asset => heldIds.has(asset.id)),
    removed: mine.filter(asset => gone.has(asset.id)).map(asset => asset.id),
    details: [...incoming.values()].filter(version => shown.has(version.id) && !held.unsaved.has(version.id)
      && version.metadataUpdatedAt !== (known.get(version.id)?.metadataUpdatedAt ?? null)),
  };
}

export type LiveRefreshEnv = {
  visible(): boolean;
  now(): number;
  /** Calls `run` when the window is shown again or regains focus; returns the unsubscribe. */
  onWake(run: () => void): () => void;
  setTimer(run: () => void, ms: number): unknown;
  clearTimer(timer: unknown): void;
};

export function browserRefreshEnv(): LiveRefreshEnv {
  return {
    visible: () => document.visibilityState === 'visible',
    now: () => Date.now(),
    onWake(run) {
      const shown = () => { if (document.visibilityState === 'visible') run(); };
      document.addEventListener('visibilitychange', shown);
      window.addEventListener('focus', run);
      return () => { document.removeEventListener('visibilitychange', shown); window.removeEventListener('focus', run); };
    },
    setTimer: (run, ms) => setTimeout(run, ms),
    clearTimer: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  };
}

export type LiveReaderOptions = {
  /** What to read now: the open project and how many of its assets the workspace holds. `null`: nothing to read. */
  target(): { projectId: string; known: number } | null;
  /** The cursor a project's first read starts from (see `liveCursor`). */
  start(projectId: string): number;
  apply(projectId: string, changes: LiveChanges): void;
  request?(projectId: string, since: number, known: number, signal: AbortSignal): Promise<LiveChanges>;
};

async function requestChanges(projectId: string, since: number, known: number, signal: AbortSignal): Promise<LiveChanges> {
  const response = await fetch(`/api/owner-changes?projectId=${encodeURIComponent(projectId)}&since=${since}&known=${known}`, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Changes unavailable');
  return await response.json();
}

/**
 * One read of the open project's changes, for `observeChanges`. Each project keeps its own cursor, which never moves back.
 * Call `wrote()` when a change made in this workspace has been saved: an answer asked for before that may describe
 * the workspace as it was, so it is not used and `read` resolves `false` (ask again soon, from the same cursor).
 */
export function liveReader(options: LiveReaderOptions) {
  const cursors = new Map<string, number>();
  const request = options.request ?? requestChanges;
  let writes = 0;
  return {
    wrote() { writes += 1; },
    async read(signal: AbortSignal): Promise<boolean | void> {
      const target = options.target();
      if (!target) return;
      const asked = writes;
      const since = cursors.get(target.projectId) ?? options.start(target.projectId);
      const changes = await request(target.projectId, since, target.known, signal);
      if (signal.aborted) return;
      if (writes !== asked) return false;
      options.apply(target.projectId, changes);
      const cursor = Number(changes.cursor);
      cursors.set(target.projectId, Number.isSafeInteger(cursor) ? Math.max(since, cursor) : since);
    },
  };
}

const INTERVAL_MS = 10_000, SOON_MS = 1_000, WAKE_GAP_MS = 2_000, READ_TIMEOUT_MS = 10_000;

/**
 * Asks for changes every ten seconds while the window is visible, and at once when it is shown or focused again.
 * One read at a time; nothing is read while hidden; a failed read is silent and tried again on the next interval.
 * `read` resolves `false` to be asked again soon (its answer could not be used).
 * `refresh()` asks at once (another project was opened); during a read it asks again soon after it.
 */
export function observeChanges(read: (signal: AbortSignal) => Promise<boolean | void>, env: LiveRefreshEnv = browserRefreshEnv()) {
  let stopped = false, busy = false, again = false, settledAt = -Infinity;
  let timer: unknown, request: AbortController | undefined;
  function schedule(ms: number) {
    env.clearTimer(timer);
    if (!stopped) timer = env.setTimer(() => void tick(), ms);
  }
  async function tick() {
    if (stopped || busy) return;
    if (!env.visible()) { schedule(INTERVAL_MS); return; }
    busy = true; again = false;
    env.clearTimer(timer);
    const controller = request = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    let soon = false;
    try { soon = (await read(controller.signal)) === false; }
    catch { /* Keep the usable workspace; the next interval asks again. */ }
    finally {
      clearTimeout(timeout);
      busy = false; settledAt = env.now();
      schedule(soon || again ? SOON_MS : INTERVAL_MS);
    }
  }
  // Showing and focusing a window usually arrive together; the second one finds the first read just made.
  const unsubscribe = env.onWake(() => { if (!busy && env.now() - settledAt >= WAKE_GAP_MS) void tick(); });
  schedule(INTERVAL_MS);
  return {
    refresh() { if (busy) again = true; else void tick(); },
    stop() { stopped = true; env.clearTimer(timer); request?.abort(); unsubscribe(); },
  };
}

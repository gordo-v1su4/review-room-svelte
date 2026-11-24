/**
 * The owner workspace's address: what is open, written to the query string so a link or a reload lands on it.
 * `/?project=<id>&folder=<id>&asset=<id or code>&version=<id or v003>&t=<seconds>`
 */
export type WorkspaceAddress = Readonly<{ project?: string; folder?: string; asset?: string; version?: string; t?: number }>;
export type AddressData = Readonly<{
  projects: readonly Readonly<{ id: string; archived?: boolean }>[];
  folders: readonly Readonly<{ id: string; projectId: string }>[];
  /** `copy`: a copy made with Copy to folder shares its original's code. */
  assets: readonly Readonly<{ id: string; projectId: string; folderId?: string | null; code?: string | null; archived?: boolean; copy?: boolean }>[];
  versions: readonly Readonly<{ id: string; assetId: string; version: number }>[];
}>;
/** What to open. A null version follows the asset's current version. */
export type WorkspaceTarget = Readonly<{ projectId: string | null; folderId: string | null; assetId: string | null; versionId: string | null; t: number | null }>;

const parts = ['project', 'folder', 'asset', 'version', 't'] as const;
const params = (search: string | URLSearchParams) => new URLSearchParams(search);
const seconds = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function parseWorkspaceAddress(search: string | URLSearchParams): WorkspaceAddress {
  const query = params(search);
  const text = (name: string) => query.get(name)?.trim() || undefined;
  const raw = text('t');
  const t = raw === undefined ? undefined : Number(raw);
  const address = { project: text('project'), folder: text('folder'), asset: text('asset'), version: text('version'), t: seconds(t) ? t : undefined };
  return Object.fromEntries(Object.entries(address).filter(([, value]) => value !== undefined));
}

/** The query string (`''` or `'?…'`) for an address, keeping every param that is not part of it. */
export function workspaceSearch(search: string | URLSearchParams, address: WorkspaceAddress): string {
  const next = new URLSearchParams();
  for (const name of parts) {
    const value = address[name];
    if (name === 't') { if (seconds(value)) next.set(name, String(Math.round((value as number) * 1000) / 1000)); }
    else if (typeof value === 'string' && value.trim()) next.set(name, value.trim());
  }
  for (const [name, value] of params(search)) if (!(parts as readonly string[]).includes(name)) next.append(name, value);
  const text = next.toString();
  return text ? `?${text}` : '';
}

/**
 * Resolves an address against loaded data. Unknown, archived or foreign parts are dropped and the deepest
 * part that exists is kept. A code is looked up only inside the given project; an asset ID alone finds its project.
 * An asset always opens in the folder it lives in.
 */
export function resolveWorkspaceAddress(address: WorkspaceAddress, data: AddressData): WorkspaceTarget {
  const open = (id: string | undefined) => data.projects.find(project => project.id === id && !project.archived);
  const given = open(address.project);
  const reachable = data.assets.filter(asset => !asset.archived && (given ? asset.projectId === given.id : !!open(asset.projectId)));
  const code = address.asset?.toUpperCase();
  const inProject = given && code ? reachable.filter(asset => asset.code?.toUpperCase() === code) : [];
  const asset = address.asset === undefined ? undefined
    : reachable.find(item => item.id === address.asset) ?? inProject.find(item => !item.copy) ?? inProject[0];
  const project = given ?? open(asset?.projectId);
  if (!project) return { projectId: null, folderId: null, assetId: null, versionId: null, t: null };
  if (!asset) {
    const folder = data.folders.find(item => item.id === address.folder && item.projectId === project.id);
    return { projectId: project.id, folderId: folder?.id ?? null, assetId: null, versionId: null, t: null };
  }
  const versions = data.versions.filter(version => version.assetId === asset.id);
  const number = address.version?.match(/^v?0*([1-9]\d*)$/i)?.[1];
  const version = address.version === undefined ? undefined
    : versions.find(item => item.id === address.version) ?? (number ? versions.find(item => item.version === Number(number)) : undefined);
  const folder = data.folders.find(item => item.id === asset.folderId && item.projectId === project.id);
  return { projectId: project.id, folderId: folder?.id ?? null, assetId: asset.id, versionId: version?.id ?? null, t: address.t ?? null };
}

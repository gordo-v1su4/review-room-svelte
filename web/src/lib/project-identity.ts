export type ProjectIdentity = Readonly<{ id: string; name: string; clientName?: string; description?: string; brandColor?: string; bannerUrl?: string }>;
export type ProjectIdentityDraft = { name: string; clientName: string; description: string; brandColor: string; banner?: File | null };
type IdentityPatch = Omit<ProjectIdentityDraft, 'banner'> & { bannerUrl?: string | null };
type IdentityAccess = Readonly<{ isAdmin: boolean; editableProjectIds: readonly string[] }>;

/** Local metadata only. Visibility, membership and storage authorization stay server-owned. */
export function updateProjectIdentity(project: ProjectIdentity, patch: IdentityPatch, access: IdentityAccess): ProjectIdentity {
  if (!access.isAdmin || !access.editableProjectIds.includes(project.id)) throw new Error('Project editing is unavailable.');
  const name = patch.name.trim();
  if (!name) throw new Error('Enter a project name.');
  if (!/^#[0-9a-f]{6}$/i.test(patch.brandColor)) throw new Error('Choose a six-digit hex color.');
  if (patch.bannerUrl != null && !patch.bannerUrl.startsWith('blob:')) throw new Error('Choose a local banner image.');
  const { clientName: _client, description: _description, bannerUrl: previousBanner, ...rest } = project;
  const clientName = patch.clientName.trim(), description = patch.description.trim();
  const bannerUrl = patch.bannerUrl === undefined ? previousBanner : patch.bannerUrl ?? undefined;
  return { ...rest, name, brandColor: patch.brandColor.toLowerCase(), ...(clientName ? { clientName } : {}), ...(description ? { description } : {}), ...(bannerUrl ? { bannerUrl } : {}) };
}

/** Bound the local banner derivative; the original file never enters persistent storage. */
export async function prepareProjectBanner(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image for the project banner.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preview is unavailable.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the banner.')), 'image/webp', .85));
    return URL.createObjectURL(blob);
  } catch { throw new Error('This image could not be opened. Choose another image.'); }
  finally { URL.revokeObjectURL(source); }
}

import { normalizeAppearance, type AppearanceValue } from './appearance';

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type CardFields = Pick<AppearanceValue, 'visibleFields' | 'fieldOrder'>;

/** Shared display settings, project-specific fields. Storage failures retain session choices. */
export function createAppearancePreferences(initialProjectId: string, storage?: StoragePort) {
  const read = (key: string): unknown => {
    try { return JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return null; }
  };
  const write = (key: string, value: unknown) => {
    try { storage?.setItem(key, JSON.stringify(value)); } catch { /* Session choices remain usable. */ }
  };
  const globalKey = 'review-room.appearance';
  const fieldKey = (id: string) => `review-room.project-fields.${encodeURIComponent(id)}`;
  let display = normalizeAppearance(read(globalKey));
  const fields = new Map<string, CardFields>();

  function load(projectId: string): AppearanceValue {
    let selectedFields = fields.get(projectId);
    if (!selectedFields) {
      // Preserve the old single-workspace choices only for the original local project.
      const stored = read(fieldKey(projectId));
      const normalized = normalizeAppearance(stored ?? (projectId === initialProjectId ? display : null));
      selectedFields = { visibleFields: normalized.visibleFields, fieldOrder: normalized.fieldOrder };
      fields.set(projectId, selectedFields);
    }
    return normalizeAppearance({ ...display, ...selectedFields });
  }

  // Capture legacy fields before a different project's first save replaces global display settings.
  const initial = load(initialProjectId);
  write(fieldKey(initialProjectId), { visibleFields: initial.visibleFields, fieldOrder: initial.fieldOrder });

  function save(projectId: string, value: AppearanceValue): AppearanceValue {
    const normalized = normalizeAppearance(value);
    const { visibleFields, fieldOrder, ...shared } = normalized;
    display = normalizeAppearance(shared);
    fields.set(projectId, { visibleFields, fieldOrder });
    write(fieldKey(projectId), { visibleFields, fieldOrder });
    write(globalKey, shared);
    return load(projectId);
  }

  return { load, save };
}

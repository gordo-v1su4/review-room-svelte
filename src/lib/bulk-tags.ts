/** Preserve display spelling while treating whitespace and case variants as one tag. */
export function updateTags(current: readonly string[], requested: readonly string[], mode: 'add' | 'remove'): string[] {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
  const removed = new Set(mode === 'remove' ? requested.map(value => normalize(value).toLowerCase()) : []);
  const tags = new Map<string, string>();
  for (const value of mode === 'add' ? [...current, ...requested] : current) {
    const tag = normalize(value);
    const key = tag.toLowerCase();
    if (tag && !removed.has(key) && !tags.has(key)) tags.set(key, tag);
  }
  return [...tags.values()];
}

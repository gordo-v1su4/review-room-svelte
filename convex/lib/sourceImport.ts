type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject { return !!value && typeof value === 'object' && !Array.isArray(value); }
export type SourceMediaMapping = { assetId: string; sourceArtifactId: string; displayedVersionNumber?: number };
export function parseSourceImport(sourceJson: string, mappingsJson: string) {
  const source: unknown = JSON.parse(sourceJson);
  const mappings: unknown = JSON.parse(mappingsJson);
  if (!object(source) || !Array.isArray(source.artifacts) || !source.artifacts.every(object) || !Array.isArray(mappings)) throw new Error('Invalid import metadata');
  const mediaMappings: SourceMediaMapping[] = mappings.map(value => {
    if (!object(value) || typeof value.assetId !== 'string' || !value.assetId || typeof value.sourceArtifactId !== 'string' || !value.sourceArtifactId || (value.displayedVersionNumber !== undefined && (!Number.isSafeInteger(value.displayedVersionNumber) || (value.displayedVersionNumber as number) < 1))) throw new Error('Invalid import mapping');
    return { assetId: value.assetId, sourceArtifactId: value.sourceArtifactId, displayedVersionNumber: value.displayedVersionNumber as number | undefined };
  });
  return { artifacts: source.artifacts as JsonObject[], mediaMappings };
}
function text(...values: unknown[]) { return values.find(value => typeof value === 'string' && value.trim()) as string | undefined ?? ''; }
export function importedMediaMetadata(sourceJson: string, mappingsJson: string) {
  try {
    const { artifacts, mediaMappings } = parseSourceImport(sourceJson, mappingsJson);
    const byId = new Map(artifacts.filter(item => typeof item.artifact_id === 'string').map(item => [item.artifact_id, item]));
    return mediaMappings.flatMap(mapping => {
      const artifact = byId.get(mapping.sourceArtifactId);
      if (!artifact) return [];
      const model = text(artifact.video_model, artifact.model, artifact.target_model);
      return [{ assetId: mapping.assetId, label: text(artifact.title), prompt: text(artifact.version_prompt, artifact.prompt_text), model: model.toLowerCase() === 'manual' ? '' : model, sourceCreatedAt: text(artifact.created_at), sourceVersionNumber: typeof artifact.version_number === 'number' && Number.isSafeInteger(artifact.version_number) && artifact.version_number > 0 ? artifact.version_number : mapping.displayedVersionNumber }];
    });
  } catch { return []; }
}

/** User-facing label for assets not in a subfolder (the project workspace root). */
export function projectRootLabel(projectTitle?: string | null) {
  const title = projectTitle?.trim();
  return title && title.length > 0 ? title : "Project";
}

export function moveMediaToRootLabel(projectTitle?: string | null) {
  return `Move media to ${projectRootLabel(projectTitle)}`;
}

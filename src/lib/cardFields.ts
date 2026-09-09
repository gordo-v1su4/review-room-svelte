export type CardFieldId =
  | "status"
  | "rating"
  | "shortlist"
  | "uploader"
  | "uploadedAt"
  | "duration"
  | "resolution"
  | "assetCode"
  | "assetClass"
  | "commentCount"
  | "tags"
  | "filename";

export const CARD_FIELD_DEFINITIONS: Array<{
  id: CardFieldId;
  label: string;
  defaultVisible: boolean;
}> = [
  { id: "status", label: "Status", defaultVisible: true },
  { id: "rating", label: "Rating", defaultVisible: true },
  { id: "shortlist", label: "Shortlist", defaultVisible: false },
  { id: "uploader", label: "Uploader", defaultVisible: false },
  { id: "uploadedAt", label: "Uploaded", defaultVisible: true },
  { id: "duration", label: "Duration", defaultVisible: false },
  { id: "resolution", label: "Resolution", defaultVisible: false },
  { id: "assetCode", label: "Asset code", defaultVisible: false },
  { id: "assetClass", label: "Class", defaultVisible: false },
  { id: "commentCount", label: "Comments", defaultVisible: true },
  { id: "tags", label: "Tags", defaultVisible: false },
  { id: "filename", label: "Filename", defaultVisible: false },
];

export const DEFAULT_VISIBLE_CARD_FIELDS = CARD_FIELD_DEFINITIONS
  .filter((field) => field.defaultVisible)
  .map((field) => field.id);

export function normalizeVisibleFields(fields?: string[] | null): CardFieldId[] {
  const valid = new Set(CARD_FIELD_DEFINITIONS.map((field) => field.id));
  const source = fields?.length ? fields : DEFAULT_VISIBLE_CARD_FIELDS;
  return source.filter((id): id is CardFieldId => valid.has(id as CardFieldId));
}

import { CARD_FIELD_DEFINITIONS, DEFAULT_VISIBLE_CARD_FIELDS, type CardFieldId } from './cardFields';
export { CARD_FIELD_DEFINITIONS, type CardFieldId };

export type AppearanceValue = {
  aspect: 'square' | 'landscape' | 'portrait';
  fit: 'fit' | 'fill';
  size: 'small' | 'medium' | 'large';
  showInfo: boolean;
  visibleFields: CardFieldId[];
  fieldOrder: CardFieldId[];
};

export const DEFAULT_APPEARANCE: AppearanceValue = {
  aspect: 'landscape', fit: 'fill', size: 'medium', showInfo: true,
  visibleFields: [...DEFAULT_VISIBLE_CARD_FIELDS],
  fieldOrder: CARD_FIELD_DEFINITIONS.map(field => field.id)
};

/** Validate persisted preferences; never rely on a cast of localStorage JSON. */
export function normalizeAppearance(value: unknown): AppearanceValue {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const aspect = input.aspect ?? (input.aspectRatio === 'video' ? 'landscape' : input.aspectRatio);
  const fit = input.fit ?? input.thumbnailScale;
  const size = input.size ?? (input.gridSize === 'sm' ? 'small' : input.gridSize === 'lg' ? 'large' : 'medium');
  const showInfo = input.showInfo ?? input.showCardInfo;
  const visibleFields = input.visibleFields ?? input.visibleCardFields;
  const allFields = CARD_FIELD_DEFINITIONS.map(field => field.id);
  const sanitize = (items: unknown[]): CardFieldId[] => [...new Set(items.filter((id): id is CardFieldId => typeof id === 'string' && allFields.includes(id as CardFieldId)))];
  const order = Array.isArray(input.fieldOrder) ? sanitize(input.fieldOrder) : [];
  return {
    aspect: aspect === 'square' || aspect === 'portrait' || aspect === 'landscape' ? aspect : DEFAULT_APPEARANCE.aspect,
    fit: fit === 'fit' ? 'fit' : 'fill',
    size: size === 'small' || size === 'large' ? size : 'medium',
    showInfo: typeof showInfo === 'boolean' ? showInfo : true,
    visibleFields: Array.isArray(visibleFields) ? sanitize(visibleFields) : [...DEFAULT_VISIBLE_CARD_FIELDS],
    fieldOrder: [...order, ...allFields.filter(id => !order.includes(id))]
  };
}

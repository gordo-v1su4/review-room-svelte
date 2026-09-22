export type PreviewRequest = { type: 'init'; source: Blob } | { type: 'seek'; id: number; time: number } | { type: 'cancel' };
export type PreviewInfo = { codec: string; estimatedFps?: number; duration: number; width: number; height: number };
export type PreviewResponse =
  | { type: 'ready'; info: PreviewInfo }
  | { type: 'frame'; id: number; bitmap: ImageBitmap; time: number; decodeMs: number }
  | { type: 'fallback'; reason: string };

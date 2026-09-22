import { openLocalAsset, type LocalAsset } from './review';

/** Validate native readability before committing an asset to the local workspace. */
export async function prepareLocalImport(file: File, signal: AbortSignal): Promise<LocalAsset> {
  if (signal.aborted) throw new DOMException('Import cancelled.', 'AbortError');
  if (!file.size) throw new Error('This file is empty. Choose a complete video or image.');
  const asset = openLocalAsset(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const media = document.createElement(asset.type === 'video' ? 'video' : 'img');
      const video = media instanceof HTMLVideoElement ? media : undefined;
      const image = media instanceof HTMLImageElement ? media : undefined;
      const eventName = video ? 'loadeddata' : 'load';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        media.removeEventListener(eventName, ready);
        media.removeEventListener('error', failed);
        media.removeAttribute('src');
        if (video) video.load();
        if (error) reject(error); else resolve();
      };
      const ready = () => {
        const width = video?.videoWidth ?? image?.naturalWidth ?? 0;
        const height = video?.videoHeight ?? image?.naturalHeight ?? 0;
        if (!width || !height || (video && (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !Number.isFinite(video.duration) || video.duration <= 0))) {
          finish(new Error('This file has no readable media. Choose another file.')); return;
        }
        asset.width = width; asset.height = height;
        if (video) asset.duration = video.duration;
        finish();
      };
      const failed = () => finish(new Error(`This ${asset.type} could not be read. It may be incomplete or use an unsupported format.`));
      const cancel = () => finish(new DOMException('Import cancelled.', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('Reading this file timed out. Retry or choose another file.')), 15_000);
      signal.addEventListener('abort', cancel, { once: true });
      media.addEventListener(eventName, ready, { once: true });
      media.addEventListener('error', failed, { once: true });
      if (video) { video.preload = 'auto'; video.muted = true; video.playsInline = true; }
      media.src = asset.url;
      if (video) video.load();
    });
    if (signal.aborted) throw new DOMException('Import cancelled.', 'AbortError');
    return asset;
  } catch (error) {
    URL.revokeObjectURL(asset.url);
    throw error;
  }
}

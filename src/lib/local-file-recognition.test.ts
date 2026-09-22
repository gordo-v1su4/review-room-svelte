import { expect, test } from 'bun:test';
import { openLocalAsset } from './review';

test('local imports retain supported filename recognition when the browser omits the media MIME', () => {
  // The supported formats match the original upload contract in src/lib/media.ts.
  const formats = [
    ['clip.mp4', 'video', 'VID'], ['clip.MOV', 'video', 'VID'],
    ['clip.m4v', 'video', 'VID'], ['clip.webm', 'video', 'VID'],
    ['clip.avi', 'video', 'VID'], ['clip.mkv', 'video', 'VID'],
    ['still.jpg', 'image', 'IMG'], ['still.JPEG', 'image', 'IMG'],
    ['still.png', 'image', 'IMG'], ['still.gif', 'image', 'IMG'],
    ['still.webp', 'image', 'IMG'], ['still.avif', 'image', 'IMG'],
  ] as const;
  for (const mime of ['', 'application/octet-stream']) {
    for (const [name, type, assetClass] of formats) {
      const file = new File(['local media'], name, { type: mime });
      const asset = openLocalAsset(file);
      try {
        expect({ type: asset.type, assetClass: asset.assetClass }).toEqual({ type, assetClass });
        expect(asset.sourceFile).toBe(file);
      } finally {
        URL.revokeObjectURL(asset.url);
      }
    }
  }
});

test('local imports preserve media MIME recognition without a filename extension', () => {
  for (const [mime, type, assetClass] of [
    ['video/mp4', 'video', 'VID'], ['image/png', 'image', 'IMG'],
  ] as const) {
    const asset = openLocalAsset(new File(['media'], 'untitled', { type: mime }));
    try {
      expect({ type: asset.type, assetClass: asset.assetClass }).toEqual({ type, assetClass });
    } finally {
      URL.revokeObjectURL(asset.url);
    }
  }
});

test('local imports reject unsupported files and misleading non-final extensions', () => {
  for (const name of ['notes.txt', 'document.pdf', 'clip.mp4.exe', 'photo.jpg.backup', 'untitled']) {
    expect(() => openLocalAsset(new File(['not media'], name))).toThrow('Choose a video or image file.');
  }
});

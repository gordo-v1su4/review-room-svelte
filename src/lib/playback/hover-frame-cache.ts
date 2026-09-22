export const HOVER_FRAME_POSITIONS = 96;
export const HOVER_FRAME_EDGE = 320;

export type HoverFrame = { readonly width: number; readonly height: number; close(): void };

/** Each set transfers ownership. get borrows a frame only for synchronous drawing. */
export function createHoverFrameCache<T extends HoverFrame>(maxBytes = 24 * 1024 * 1024) {
  type Entry = { source: string; position: number; frame: T; bytes: number };
  const sources = new Map<string, { references: number; frames: Map<number, Entry> }>();
  const recent = new Map<Entry, true>();
  let bytes = 0;

  function remove(entry: Entry) {
    recent.delete(entry);
    sources.get(entry.source)?.frames.delete(entry.position);
    bytes -= entry.bytes;
    entry.frame.close();
  }

  return {
    retain(source: string) {
      let owner = sources.get(source);
      if (!owner) {
        owner = { references: 0, frames: new Map() };
        sources.set(source, owner);
      }
      const retained = owner;
      retained.references++;
      let released = false;
      return {
        get(position: number): T | undefined {
          if (released) return;
          const entry = retained.frames.get(position);
          if (!entry) return;
          recent.delete(entry);
          recent.set(entry, true);
          return entry.frame;
        },
        set(position: number, frame: T) {
          const size = frame.width * frame.height * 4;
          if (released || !Number.isFinite(size) || size <= 0 || size > maxBytes) {
            frame.close();
            return;
          }
          const previous = retained.frames.get(position);
          if (previous) remove(previous);
          const entry = { source, position, frame, bytes: size };
          retained.frames.set(position, entry);
          recent.set(entry, true);
          bytes += size;
          while (bytes > maxBytes) {
            const oldest = recent.keys().next().value;
            if (!oldest) break;
            remove(oldest);
          }
        },
        release() {
          if (released) return;
          released = true;
          retained.references--;
          if (retained.references) return;
          for (const entry of retained.frames.values()) remove(entry);
          sources.delete(source);
        },
      };
    },
  };
}

/** At most one card owns a loaded hover decoder; inactive cards hold only cached pixels. */
export function createHoverPreviewCoordinator() {
  let active: (() => void) | undefined;
  return {
    activate(stop: () => void) {
      const previous = active;
      active = stop;
      previous?.();
      return () => {
        if (active === stop) active = undefined;
      };
    },
  };
}

export type CanvasHoverFrame = HoverFrame & { readonly image: HTMLCanvasElement };
// Browser event/attachment handlers are the only consumers, so SSR creates no media state.
export const hoverFrameCache = createHoverFrameCache<CanvasHoverFrame>();
export const hoverPreviewCoordinator = createHoverPreviewCoordinator();

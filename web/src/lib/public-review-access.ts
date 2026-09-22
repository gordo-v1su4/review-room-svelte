export type PublicReviewResult<T> =
  | { kind: 'passcode'; projectTitle?: string; rejection?: 'incorrect-passcode' }
  | { kind: 'name'; projectTitle: string }
  | { kind: 'ready'; projectTitle: string; viewerName: string; data: T }
  | { kind: 'unavailable'; reason: 'expired' | 'missing' | 'unavailable' };
export type PublicReviewState<T> =
  | { kind: 'loading'; busy: true; error?: never }
  | (PublicReviewResult<T> & { busy: boolean; error?: string });
export interface PublicReviewGateway<T> {
  load(token: string, signal: AbortSignal): Promise<PublicReviewResult<T>>;
  unlock(token: string, passcode: string, signal: AbortSignal): Promise<PublicReviewResult<T>>;
  identify(token: string, name: string, signal: AbortSignal): Promise<PublicReviewResult<T>>;
}

/** The live adapter is intentionally unavailable until its authorization gates are verified. */
export const offlinePublicReviewGateway: PublicReviewGateway<never> = {
  load: async () => ({ kind: 'unavailable', reason: 'unavailable' }),
  unlock: async () => ({ kind: 'unavailable', reason: 'unavailable' }),
  identify: async () => ({ kind: 'unavailable', reason: 'unavailable' })
};

/** The gateway owns authorization. This controller only presents its confirmed state. */
export function createPublicReviewAccess<T>(gateway: PublicReviewGateway<T>, onChange: (state: PublicReviewState<T>) => void) {
  let token = '';
  let pending: AbortController | undefined;
  let disposed = false;
  let state: PublicReviewState<T> = { kind: 'loading', busy: true };
  function publish(next: PublicReviewState<T>) { state = next; onChange(next); }
  async function run(operation: (signal: AbortSignal) => Promise<PublicReviewResult<T>>) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const previous = state;
    if (previous.kind !== 'loading') {
      const { error: _error, ...gate } = previous;
      publish({ ...gate, busy: true });
    }
    try {
      const result = await operation(controller.signal);
      if (pending !== controller || controller.signal.aborted) return;
      publish({ ...result, busy: false, ...(result.kind === 'passcode' && result.rejection === 'incorrect-passcode' ? { error: 'Incorrect passcode. Try again.' } : {}) });
    } catch {
      if (pending !== controller || controller.signal.aborted) return;
      if (previous.kind === 'loading') publish({ kind: 'unavailable', reason: 'unavailable', busy: false });
      else publish({ ...previous, busy: false, error: previous.kind === 'passcode' ? 'Could not check the passcode. Try again.' : 'Could not save your name. Try again.' });
    } finally {
      if (pending === controller) pending = undefined;
    }
  }
  return {
    async load(nextToken: string) {
      if (disposed) return;
      token = nextToken;
      publish({ kind: 'loading', busy: true });
      await run(signal => gateway.load(token, signal));
    },
    async submitPasscode(passcode: string) {
      if (disposed || state.kind !== 'passcode' || state.busy) return;
      await run(signal => gateway.unlock(token, passcode, signal));
    },
    async submitName(name: string) {
      if (disposed || state.kind !== 'name' || state.busy) return;
      const trimmed = name.trim();
      if (!trimmed) { publish({ ...state, error: 'Enter your name to continue.' }); return; }
      await run(signal => gateway.identify(token, trimmed, signal));
    },
    dispose() { disposed = true; pending?.abort(); pending = undefined; token = ''; }
  };
}

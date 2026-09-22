import { expect, test } from 'bun:test';
import { createPublicReviewAccess, offlinePublicReviewGateway, type PublicReviewGateway, type PublicReviewState, type PublicReviewResult } from './public-review-access';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const gateway = (overrides: Partial<PublicReviewGateway<string>> = {}): PublicReviewGateway<string> => ({
  load: async () => ({ kind: 'passcode', projectTitle: 'Client review' }),
  unlock: async () => ({ kind: 'name', projectTitle: 'Client review' }),
  identify: async (_token, name) => ({ kind: 'ready', projectTitle: 'Client review', viewerName: name, data: 'authorized payload' }),
  ...overrides
});

test('a pending submit is deduplicated and failure retains its gate with a safe error', async () => {
  let state!: PublicReviewState<string>;
  let submissions = 0;
  const response = deferred<PublicReviewResult<string>>();
  const access = createPublicReviewAccess(gateway({ unlock: () => { submissions++; return response.promise; } }), next => state = next);
  await access.load('link');
  const pending = access.submitPasscode('secret');
  expect(state).toEqual({ kind: 'passcode', projectTitle: 'Client review', busy: true });
  await access.submitPasscode('duplicate');
  expect(submissions).toBe(1);
  response.reject(new Error('https://private.example?secret=value'));
  await pending;
  expect(state).toEqual({ kind: 'passcode', projectTitle: 'Client review', busy: false, error: 'Could not check the passcode. Try again.' });
});

test('only gateway confirmation opens review after passcode and identity gates', async () => {
  let state!: PublicReviewState<string>;
  const access = createPublicReviewAccess(gateway(), next => state = next);
  const loading = access.load('link');
  expect(state.kind).toBe('loading');
  await loading;
  expect(state).toEqual({ kind: 'passcode', projectTitle: 'Client review', busy: false });
  await access.submitName('Premature');
  expect(state.kind).toBe('passcode');
  await access.submitPasscode('private code');
  expect(state).toEqual({ kind: 'name', projectTitle: 'Client review', busy: false });
  await access.submitName('  Reviewer  ');
  expect(state).toEqual({ kind: 'ready', projectTitle: 'Client review', viewerName: 'Reviewer', data: 'authorized payload', busy: false });
  expect(JSON.stringify(state)).not.toContain('private code');
});

test('a new token aborts an old submit and ignores its late authorization result', async () => {
  let state!: PublicReviewState<string>;
  let signal!: AbortSignal;
  const response = deferred<PublicReviewResult<string>>();
  const access = createPublicReviewAccess(gateway({
    load: async token => token === 'old' ? { kind: 'passcode' } : { kind: 'unavailable', reason: 'expired' },
    unlock: (_token, _code, nextSignal) => { signal = nextSignal; return response.promise; }
  }), next => state = next);
  await access.load('old');
  const pending = access.submitPasscode('code');
  await access.load('new');
  expect(signal.aborted).toBe(true);
  response.resolve({ kind: 'ready', projectTitle: 'Wrong project', viewerName: 'Wrong viewer', data: 'old payload' });
  await pending;
  expect(state).toEqual({ kind: 'unavailable', reason: 'expired', busy: false });
});

test('disposing aborts loading, suppresses late failures and prevents future work', async () => {
  const states: PublicReviewState<string>[] = [];
  let signal!: AbortSignal;
  let loads = 0;
  const response = deferred<PublicReviewResult<string>>();
  const access = createPublicReviewAccess(gateway({ load: (_token, nextSignal) => { loads++; signal = nextSignal; return response.promise; } }), state => states.push(state));
  const pending = access.load('link');
  access.dispose();
  expect(signal.aborted).toBe(true);
  response.reject(new Error('private gateway error'));
  await pending;
  await access.load('another');
  expect(loads).toBe(1);
  expect(states).toEqual([{ kind: 'loading', busy: true }]);
});

test('authoritative wrong-passcode responses keep the gate and allow a successful retry', async () => {
  let state!: PublicReviewState<string>;
  const access = createPublicReviewAccess(gateway({ unlock: async (_token, code) => code === 'right' ? { kind: 'name', projectTitle: 'Review' } : { kind: 'passcode', projectTitle: 'Review', rejection: 'incorrect-passcode' } }), next => state = next);
  await access.load('link');
  await access.submitPasscode('wrong');
  expect(state).toEqual({ kind: 'passcode', projectTitle: 'Review', rejection: 'incorrect-passcode', busy: false, error: 'Incorrect passcode. Try again.' });
  await access.submitPasscode('right');
  expect(state).toEqual({ kind: 'name', projectTitle: 'Review', busy: false });
});

test('the unconfigured gateway always fails closed without granting review access', async () => {
  let state!: PublicReviewState<never>;
  const access = createPublicReviewAccess(offlinePublicReviewGateway, next => state = next);
  await access.load('any-token');
  expect(state).toEqual({ kind: 'unavailable', reason: 'unavailable', busy: false });
  await access.submitPasscode('code');
  await access.submitName('Reviewer');
  expect(state.kind).toBe('unavailable');
});

test('blank reviewer names stay at the name gate without contacting the gateway', async () => {
  let state!: PublicReviewState<string>;
  let submissions = 0;
  const access = createPublicReviewAccess(gateway({
    load: async () => ({ kind: 'name', projectTitle: 'Review' }),
    identify: async () => { submissions++; return { kind: 'ready', projectTitle: 'Review', viewerName: '', data: 'payload' }; }
  }), next => state = next);
  await access.load('link');
  await access.submitName('   ');
  expect(submissions).toBe(0);
  expect(state).toEqual({ kind: 'name', projectTitle: 'Review', busy: false, error: 'Enter your name to continue.' });
});

test('a name save failure retains the name gate without exposing gateway errors', async () => {
  let state!: PublicReviewState<string>;
  const access = createPublicReviewAccess(gateway({
    load: async () => ({ kind: 'name', projectTitle: 'Review' }),
    identify: async () => { throw new Error('private server details'); }
  }), next => state = next);
  await access.load('link');
  await access.submitName('Reviewer');
  expect(state).toEqual({ kind: 'name', projectTitle: 'Review', busy: false, error: 'Could not save your name. Try again.' });
});

test('reloading ignores a stale bootstrap even when its adapter ignores cancellation', async () => {
  let state!: PublicReviewState<string>;
  const old = deferred<PublicReviewResult<string>>();
  let signal!: AbortSignal;
  const access = createPublicReviewAccess(gateway({ load: async (token, nextSignal) => {
    if (token === 'old') { signal = nextSignal; return old.promise; }
    return { kind: 'unavailable', reason: 'missing' };
  } }), next => state = next);
  const pending = access.load('old');
  await access.load('new');
  expect(signal.aborted).toBe(true);
  old.resolve({ kind: 'ready', projectTitle: 'Old', viewerName: 'Old', data: 'Old' });
  await pending;
  expect(state).toEqual({ kind: 'unavailable', reason: 'missing', busy: false });
});

test('a failed bootstrap becomes retryable unavailable instead of leaking the failure', async () => {
  let state!: PublicReviewState<string>;
  const access = createPublicReviewAccess(gateway({ load: async () => { throw new Error('secret connection string'); } }), next => state = next);
  await access.load('link');
  expect(state).toEqual({ kind: 'unavailable', reason: 'unavailable', busy: false });
});

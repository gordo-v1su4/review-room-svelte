import { expect, test } from 'bun:test';
import { createAccountAccess, offlineAccountGateway, type AccountOutcome, type AccountRequest, type AccountState, type AuthProviders } from './account-access';

const providers: AuthProviders = { password: true, signup: true, passwordReset: true, google: true, github: true };
const signedOut: AccountOutcome = { kind: 'signed-out', providers };
const authenticated: AccountOutcome = { kind: 'authenticated', providers, user: { id: 'profile', name: 'River Lee', email: 'river@studio.test', role: 'admin' } };
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('account loading waits for confirmed profile access and offline state grants nothing', async () => {
  let state!: AccountState;
  const response = deferred<AccountOutcome>();
  const controller = createAccountAccess({ load: () => response.promise, submit: async () => signedOut, signOut: async () => signedOut }, next => state = next);
  const loading = controller.load();
  expect(state.kind).toBe('loading');
  expect(state.busy).toBe(true);
  expect('user' in state).toBe(false);
  response.resolve(authenticated); await loading;
  expect(state).toEqual({ ...authenticated, busy: false });
  const offline = createAccountAccess(offlineAccountGateway, next => state = next);
  await offline.load();
  expect(state.kind).toBe('unavailable');
  expect(Object.values(state.providers).every(value => value === false)).toBe(true);
  expect(await offline.signOut()).toBe(false);
});

test('password sign-in is deduplicated and publishes only confirmed account fields', async () => {
  const states: AccountState[] = [];
  const response = deferred<AccountOutcome>();
  let submitted = 0;
  const controller = createAccountAccess({ load: async () => signedOut, submit: async () => { submitted++; return response.promise; }, signOut: async () => signedOut }, state => states.push(state));
  await controller.load();
  const request = { type: 'password', flow: 'signIn', email: 'river@studio.test', password: 'private-password' } as const;
  const saving = controller.submit(request);
  expect(states.at(-1)?.kind).toBe('signed-out');
  expect(states.at(-1)?.busy).toBe(true);
  expect(await controller.submit(request)).toBe(false);
  expect(submitted).toBe(1);
  response.resolve({ ...authenticated, password: 'private-password', accessToken: 'private-token' } as AccountOutcome);
  expect(await saving).toBe(true);
  expect(states.at(-1)).toEqual({ ...authenticated, busy: false });
  expect(JSON.stringify(states)).not.toContain('private-password');
  expect(JSON.stringify(states)).not.toContain('private-token');
});

test('disabled providers and invalid requests cannot reach an account service', async () => {
  const requests: AccountRequest[] = [
    { type: 'password', flow: 'signIn', email: 'river@studio.test', password: 'valid-password' },
    { type: 'password', flow: 'signUp', name: 'River', email: 'river@studio.test', password: 'valid-password' },
    { type: 'reset', email: 'river@studio.test' },
    { type: 'oauth', provider: 'google' }, { type: 'oauth', provider: 'github' },
  ];
  let sent = 0;
  for (const request of requests) {
    const disabled = { password: false, signup: false, passwordReset: false, google: false, github: false };
    const controller = createAccountAccess({ load: async () => ({ kind: 'signed-out', providers: disabled }), submit: async () => { sent++; return authenticated; }, signOut: async () => signedOut }, () => {});
    await controller.load();
    expect(await controller.submit(request)).toBe(false);
  }
  const controller = createAccountAccess({ load: async () => signedOut, submit: async () => { sent++; return authenticated; }, signOut: async () => signedOut }, () => {});
  await controller.load();
  for (const request of [
    { type: 'password', flow: 'signIn', email: 'bad-email', password: 'password' },
    { type: 'password', flow: 'signIn', email: 'a@b.test', password: '' },
    { type: 'password', flow: 'signUp', name: 'River', email: 'a@b.test', password: 'short' },
    { type: 'reset', email: ' ' },
    { type: 'reset-verification', email: 'a@b.test', code: '12345678', newPassword: 'password' },
  ] satisfies AccountRequest[]) expect(await controller.submit(request)).toBe(false);
  expect(sent).toBe(0);
});

test('reset verification validates the confirmed email and code, retains its step on failure and allows retry', async () => {
  const states: AccountState[] = [];
  let fail = true, verified = 0;
  const controller = createAccountAccess({ load: async () => signedOut, submit: async request => {
    if (request.type === 'reset') return { kind: 'reset-code', email: 'river@studio.test', providers };
    verified++;
    if (fail) throw new Error('private reset token diagnostic');
    return authenticated;
  }, signOut: async () => signedOut }, state => states.push(state));
  await controller.load();
  expect(await controller.submit({ type: 'reset', email: 'river@studio.test' })).toBe(true);
  expect(states.at(-1)?.kind).toBe('reset-code');
  for (const patch of [{ email: 'other@studio.test' }, { code: '1234A678' }, { code: '1234567' }, { newPassword: 'short' }]) {
    expect(await controller.submit({ type: 'reset-verification', email: 'river@studio.test', code: '12345678', newPassword: 'private-new-password', ...patch })).toBe(false);
  }
  const request = { type: 'reset-verification', email: 'river@studio.test', code: '12345678', newPassword: 'private-new-password' } as const;
  expect(await controller.submit(request)).toBe(false);
  expect(states.at(-1)).toEqual({ kind: 'reset-code', email: 'river@studio.test', providers, busy: false, error: 'Could not complete this account request. Try again.' });
  fail = false;
  expect(await controller.submit(request)).toBe(true);
  expect(states.at(-1)?.kind).toBe('authenticated');
  expect(verified).toBe(2);
  expect(JSON.stringify(states)).not.toContain('private-new-password');
  expect(JSON.stringify(states)).not.toContain('12345678');
  expect(JSON.stringify(states)).not.toContain('private reset token');
});

test('sign-out retains the authenticated account until signed-out confirmation, including failures', async () => {
  let state!: AccountState;
  let response = deferred<AccountOutcome>();
  const controller = createAccountAccess({ load: async () => authenticated, submit: async () => signedOut, signOut: () => response.promise }, next => state = next);
  await controller.load();
  const failing = controller.signOut();
  expect(state.kind).toBe('authenticated');
  expect(state.busy).toBe(true);
  expect(await controller.signOut()).toBe(false);
  response.reject(new Error('private session token'));
  expect(await failing).toBe(false);
  expect(state).toEqual({ ...authenticated, busy: false, error: 'Could not sign out. Try again.' });
  response = deferred();
  const unavailable = controller.signOut();
  response.resolve({ kind: 'unavailable', providers });
  expect(await unavailable).toBe(false);
  expect(state.kind).toBe('authenticated');
  response = deferred();
  const success = controller.signOut();
  response.resolve(signedOut);
  expect(await success).toBe(true);
  expect(state).toEqual({ ...signedOut, busy: false });
});

test('loading failures and incomplete profiles fail closed, while retry and denied outcomes stay authoritative', async () => {
  const states: AccountState[] = [];
  let outcome: AccountOutcome | Error = new Error('private session diagnostic');
  const controller = createAccountAccess({ load: async () => { if (outcome instanceof Error) throw outcome; return outcome; }, submit: async () => authenticated, signOut: async () => signedOut }, state => states.push(state));
  await controller.load();
  expect(states.at(-1)?.kind).toBe('unavailable');
  expect(states.at(-1)?.busy).toBe(false);
  expect(states.at(-1)?.error).toBe('Could not load your account. Try again.');
  outcome = { kind: 'authenticated', providers, user: { id: 'profile', name: 'River', email: 'river@studio.test', role: 'unknown' } } as unknown as AccountOutcome;
  await controller.load();
  expect(states.at(-1)?.kind).toBe('unavailable');
  outcome = { kind: 'denied', providers, user: authenticated.kind === 'authenticated' ? authenticated.user : undefined } as AccountOutcome;
  await controller.load();
  expect(states.at(-1)).toEqual({ kind: 'denied', providers, busy: false });
  expect(await controller.submit({ type: 'oauth', provider: 'google' })).toBe(false);
  expect(await controller.signOut()).toBe(true);
  outcome = signedOut;
  await controller.load();
  expect(states.at(-1)).toEqual({ ...signedOut, busy: false });
  expect(JSON.stringify(states)).not.toContain('private session diagnostic');
});

test('a fresh load cancels older loads, submit and sign-out without accepting their late outcomes', async () => {
  const states: AccountState[] = [], signals: AbortSignal[] = [];
  let response = deferred<AccountOutcome>();
  const receive = (signal: AbortSignal) => { signals.push(signal); return response.promise; };
  const controller = createAccountAccess({ load: receive, submit: (_, signal) => receive(signal), signOut: receive }, state => states.push(state));
  const firstResponse = response;
  const first = controller.load();
  response = deferred();
  const second = controller.load();
  expect(signals[0].aborted).toBe(true);
  response.resolve(signedOut); await second;
  firstResponse.resolve(authenticated); await first;
  expect(states.at(-1)?.kind).toBe('signed-out');
  response = deferred();
  const submissionResponse = response;
  const submission = controller.submit({ type: 'oauth', provider: 'google' });
  response = deferred();
  const reload = controller.load();
  expect(signals[2].aborted).toBe(true);
  response.resolve(authenticated); await reload;
  const count = states.length;
  submissionResponse.reject(new Error('late error'));
  expect(await submission).toBe(false);
  expect(states.length).toBe(count);
  response = deferred();
  const logoutResponse = response;
  const logout = controller.signOut();
  response = deferred();
  const finalLoad = controller.load();
  expect(signals[4].aborted).toBe(true);
  response.resolve(authenticated); await finalLoad;
  logoutResponse.resolve(signedOut);
  expect(await logout).toBe(false);
  expect(states.at(-1)).toEqual({ ...authenticated, busy: false });
});

test('dispose aborts pending account work and blocks all future calls and publications', async () => {
  const states: AccountState[] = [];
  let signal!: AbortSignal, calls = 0;
  const response = deferred<AccountOutcome>();
  const controller = createAccountAccess({ load: async () => signedOut, submit: async (_, nextSignal) => { calls++; signal = nextSignal; return response.promise; }, signOut: async () => { calls++; return signedOut; } }, state => states.push(state));
  await controller.load();
  const submission = controller.submit({ type: 'oauth', provider: 'github' });
  const count = states.length;
  controller.dispose(); controller.dispose();
  expect(signal.aborted).toBe(true);
  response.resolve(authenticated);
  expect(await submission).toBe(false);
  await controller.load();
  expect(await controller.submit({ type: 'oauth', provider: 'github' })).toBe(false);
  expect(await controller.signOut()).toBe(false);
  expect(calls).toBe(1);
  expect(states.length).toBe(count);
});

test('signup permits an omitted display name and normalizes details without altering the password', async () => {
  let submitted: AccountRequest | undefined;
  const controller = createAccountAccess({ load: async () => signedOut, submit: async request => { submitted = request; return authenticated; }, signOut: async () => signedOut }, () => {});
  await controller.load();
  expect(await controller.submit({ type: 'password', flow: 'signUp', name: ' ', email: ' river@studio.test ', password: ' password ' })).toBe(true);
  expect(submitted).toEqual({ type: 'password', flow: 'signUp', name: '', email: 'river@studio.test', password: ' password ' });
});

test('unavailable or rejected submissions retain the form step and expose only a safe error', async () => {
  let state!: AccountState, fail = false;
  const controller = createAccountAccess({ load: async () => signedOut, submit: async () => fail ? { kind: 'unavailable', providers } : { kind: 'reset-code', email: 'river@studio.test', providers }, signOut: async () => signedOut }, next => state = next);
  await controller.load();
  await controller.submit({ type: 'reset', email: 'river@studio.test' });
  fail = true;
  expect(await controller.submit({ type: 'reset-verification', email: 'river@studio.test', code: '12345678', newPassword: 'password' })).toBe(false);
  expect(state.kind).toBe('reset-code');
  expect(state.error).toBe('Could not complete this account request. Try again.');
  fail = false;
  expect(await controller.submit({ type: 'reset', email: 'river@studio.test' })).toBe(true);
  expect(state.error).toBeUndefined();
});

test('OAuth redirects publish no URL or credentials and cannot grant an authenticated profile', async () => {
  let state!: AccountState, submissions = 0;
  const controller = createAccountAccess({ load: async () => signedOut, submit: async () => { submissions++; return { kind: 'redirecting', providers, url: 'https://private.example/secret', user: { role: 'admin' } } as AccountOutcome; }, signOut: async () => signedOut }, next => state = next);
  await controller.load();
  expect(await controller.submit({ type: 'oauth', provider: 'google' })).toBe(true);
  expect(state).toEqual({ kind: 'redirecting', providers, busy: false });
  expect(await controller.submit({ type: 'oauth', provider: 'google' })).toBe(false);
  expect(submissions).toBe(1);
});

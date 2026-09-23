export type AuthProviders = Readonly<{ password: boolean; signup: boolean; passwordReset: boolean; google: boolean; github: boolean }>;
export type AccountUser = Readonly<{ id: string; name: string; email: string; role: 'admin' | 'client' }>;
/** Authenticated means the adapter confirmed both the session and an authorized app profile. */
export type AccountOutcome = (
  | { kind: 'signed-out' | 'unavailable' | 'denied' | 'redirecting' }
  | { kind: 'reset-code'; email: string }
  | { kind: 'authenticated'; user: AccountUser }
) & { providers: AuthProviders };
export type AccountState = (AccountOutcome | { kind: 'loading'; providers: AuthProviders }) & { busy: boolean; error?: string };
export type AccountRequest =
  | { type: 'password'; flow: 'signIn'; email: string; password: string }
  | { type: 'password'; flow: 'signUp'; name: string; email: string; password: string }
  | { type: 'reset'; email: string }
  | { type: 'reset-verification'; email: string; code: string; newPassword: string }
  | { type: 'oauth'; provider: 'google' | 'github' };
export interface AccountGateway {
  load(signal: AbortSignal): Promise<AccountOutcome>;
  /** OAuth adapters perform safe redirects themselves; no redirect URL belongs in UI state. */
  submit(request: AccountRequest, signal: AbortSignal): Promise<AccountOutcome>;
  signOut(signal: AbortSignal): Promise<AccountOutcome>;
}
const disabledProviders: AuthProviders = { password: false, signup: false, passwordReset: false, google: false, github: false };
export const offlineAccountGateway: AccountGateway = {
  load: async () => ({ kind: 'unavailable', providers: disabledProviders }),
  submit: async () => ({ kind: 'unavailable', providers: disabledProviders }),
  signOut: async () => { throw new Error('Account service unavailable.'); },
};

function safeOutcome(outcome: AccountOutcome): AccountOutcome {
  const providers: AuthProviders = {
    password: outcome.providers?.password === true, signup: outcome.providers?.signup === true,
    passwordReset: outcome.providers?.passwordReset === true, google: outcome.providers?.google === true, github: outcome.providers?.github === true,
  };
  switch (outcome.kind) {
    case 'authenticated': {
      const user = outcome.user;
      if (!user || typeof user.id !== 'string' || !user.id.trim() || typeof user.name !== 'string' || typeof user.email !== 'string' || !['admin', 'client'].includes(user.role)) throw new Error('Unconfirmed app profile');
      return { kind: 'authenticated', providers, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }
    case 'reset-code': return { kind: 'reset-code', providers, email: outcome.email };
    case 'signed-out': case 'unavailable': case 'denied': case 'redirecting': return { kind: outcome.kind, providers };
    default: throw new Error('Invalid account response');
  }
}

const validEmail = (email: string) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
function validRequest(request: AccountRequest, state: AccountState): boolean {
  const { providers } = state;
  switch (request.type) {
    case 'oauth': return (request.provider === 'google' || request.provider === 'github') && providers[request.provider];
    case 'password': return providers.password && validEmail(request.email) && typeof request.password === 'string' && (
      request.flow === 'signIn' ? request.password.length > 0 : request.flow === 'signUp' && providers.signup && typeof request.name === 'string' && request.password.length >= 8
    );
    case 'reset': return providers.password && providers.passwordReset && validEmail(request.email);
    case 'reset-verification': return providers.password && providers.passwordReset && state.kind === 'reset-code'
      && validEmail(request.email) && request.email.trim().toLowerCase() === state.email.toLowerCase()
      && typeof request.code === 'string' && /^\d{8}$/.test(request.code.trim()) && typeof request.newPassword === 'string' && request.newPassword.length >= 8;
    default: return false;
  }
}

function normalizedRequest(request: AccountRequest): AccountRequest {
  switch (request.type) {
    case 'oauth': return { type: 'oauth', provider: request.provider };
    case 'password': return request.flow === 'signUp'
      ? { type: 'password', flow: 'signUp', email: request.email.trim(), name: request.name.trim(), password: request.password }
      : { type: 'password', flow: 'signIn', email: request.email.trim(), password: request.password };
    case 'reset': return { type: 'reset', email: request.email.trim() };
    case 'reset-verification': return { type: 'reset-verification', email: request.email.trim(), code: request.code.trim(), newPassword: request.newPassword };
  }
}

export function createAccountAccess(gateway: AccountGateway, onChange: (state: AccountState) => void) {
  let state: AccountState = { kind: 'loading', providers: disabledProviders, busy: true };
  let pending: AbortController | undefined;
  let disposed = false;
  function publish(next: AccountState) { if (!disposed) { state = next; onChange(next); } }
  function begin() { pending?.abort(); pending = new AbortController(); return pending; }
  const current = (request: AbortController) => !disposed && pending === request && !request.signal.aborted;
  return {
    async load() {
      if (disposed) return;
      const request = begin();
      publish({ kind: 'loading', providers: disabledProviders, busy: true });
      try {
        const outcome = await gateway.load(request.signal);
        if (current(request)) publish({ ...safeOutcome(outcome), busy: false });
      } catch {
        if (current(request)) publish({ kind: 'unavailable', providers: disabledProviders, busy: false, error: 'Could not load your account. Try again.' });
      } finally {
        if (pending === request) pending = undefined;
      }
    },
    async submit(request: AccountRequest): Promise<boolean> {
      if (disposed || state.busy || !['signed-out', 'reset-code'].includes(state.kind)) return false;
      if (!validRequest(request, state)) {
        publish({ ...state, error: 'Check your details and choose an available sign-in method.' });
        return false;
      }
      const previous = state;
      const operation = begin();
      publish({ ...state, busy: true, error: undefined });
      try {
        const response = await gateway.submit(normalizedRequest(request), operation.signal);
        if (!current(operation)) return false;
        const outcome = safeOutcome(response);
        if (outcome.kind === 'unavailable' || outcome.kind === 'signed-out') {
          publish({ ...previous, providers: outcome.providers, busy: false, error: 'Could not complete this account request. Try again.' });
          return false;
        }
        publish({ ...outcome, busy: false });
        return outcome.kind === 'authenticated' || outcome.kind === 'reset-code' || outcome.kind === 'redirecting';
      } catch {
        if (current(operation)) publish({ ...previous, busy: false, error: 'Could not complete this account request. Try again.' });
        return false;
      } finally {
        if (pending === operation) pending = undefined;
      }
    },
    async signOut(): Promise<boolean> {
      if (disposed || state.busy || !['authenticated', 'denied'].includes(state.kind)) return false;
      const previous = state;
      const operation = begin();
      publish({ ...state, busy: true, error: undefined });
      try {
        const response = await gateway.signOut(operation.signal);
        if (!current(operation)) return false;
        const outcome = safeOutcome(response);
        if (outcome.kind !== 'signed-out') throw new Error('Sign-out unconfirmed');
        publish({ ...outcome, busy: false });
        return true;
      } catch {
        if (current(operation)) publish({ ...previous, busy: false, error: 'Could not sign out. Try again.' });
        return false;
      } finally {
        if (pending === operation) pending = undefined;
      }
    },
    dispose() { disposed = true; pending?.abort(); pending = undefined; },
  };
}

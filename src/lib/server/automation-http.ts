import { createHash } from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }

export function automationBearer(event: RequestEvent) {
  const bearer = event.request.headers.get('authorization')?.match(/^Bearer (rr_v1_[A-Za-z0-9_-]{40,})$/);
  if (!bearer) throw new Error('Automation credential unavailable');
  return digest(bearer[1]);
}

export function automationRequest(event: RequestEvent, body: unknown) {
  const requestKey = event.request.headers.get('idempotency-key') ?? '';
  if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(requestKey)) throw new Error('Invalid idempotency key');
  return { keyDigest: automationBearer(event), requestKey, bodyDigest: digest(JSON.stringify(body)) };
}

export function automationError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  const known = [
    ['Automation credential unavailable', 401],
    ['Automation scope denied', 403],
    ['Idempotency key reused', 409],
    ['Invalid idempotency key', 400],
    ['Unsupported upload', 400],
    ['Upload metadata invalid', 400],
    ['Upload verification failed', 409],
    ['Uploaded original did not match', 409],
    ['Upload has not reached storage', 409],
    ['Poster size is invalid', 400],
    ['title must', 400],
    ['Folder already exists', 409],
    ['unavailable', 404],
    ['Invalid brand color', 400],
    ['ArgumentValidationError', 400],
    ['InvalidId', 400],
    ['Unexpected end of JSON input', 400],
  ] as const;
  const result = known.find(([fragment]) => message.includes(fragment));
  return json({ error: result?.[0] ?? 'Automation request failed' },
    { status: result?.[1] ?? 500, headers: { 'cache-control': 'no-store' } });
}

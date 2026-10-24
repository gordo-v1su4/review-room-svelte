import type { Handle } from '@sveltejs/kit';

// Apply the same policy to documents, SvelteKit data requests and direct downloads.
// All other application routes keep their existing authorization behavior.
export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  if (path !== '/docs/operations' && !path.startsWith('/docs/operations/')) return resolve(event);
  const headers = {
    'cache-control': 'private, no-store',
    'vary': 'Cookie',
    'x-robots-tag': 'noindex, nofollow',
  };
  // Each operations loader/endpoint calls requireOwner. Resolving first also
  // lets SvelteKit encode data redirects before we attach the privacy headers.
  const response = await resolve(event);
  for (const [name, value] of Object.entries(headers)) {
    if (name === 'vary') response.headers.append(name, value);
    else response.headers.set(name, value);
  }
  return response;
};

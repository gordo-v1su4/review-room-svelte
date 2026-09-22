export function load({ setHeaders }: { setHeaders: (headers: Record<string, string>) => void }) {
  setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' });
  return {};
}

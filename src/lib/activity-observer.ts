import type { ActivityFeed, ActivityItem } from './work-activity';

/** Observe app-owned records; credentials and task payloads never reach this feed. */
export function observeActivity(feed: ActivityFeed) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  async function poll() {
    if (stopped) return;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/owner-activity', {
        method: 'POST', signal: controller.signal, redirect: 'manual',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observedIds: feed.observedIds() }),
      });
      if (stopped) return;
      if (response.type === 'opaqueredirect' || [303, 401, 403].includes(response.status)) {
        feed.clear(); stopped = true; return;
      }
      if (!response.ok) throw new Error('Activity unavailable');
      const result: { items: ActivityItem[]; truncated: boolean } = await response.json();
      if (!stopped && !controller.signal.aborted) feed.observe(result.items, result.truncated);
    } catch { if (!stopped) feed.unavailable(); }
    finally {
      clearTimeout(timeout);
      if (!stopped) {
        const state = feed.snapshot();
        timer = setTimeout(poll, state.counts.active + state.counts.queued ? 2000 : 5000);
      }
    }
  }
  void poll();
  return { stop() { stopped = true; clearTimeout(timer); request?.abort(); } };
}

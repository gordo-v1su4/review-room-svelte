import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { db, links, review } from '$lib/server/personal';
import { dev } from '$app/environment';

function cookieName(token: string) { return `rr_review_${token.slice(0, 24)}`; }

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
  setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' });
  const token = params.token;
  const state = await db().query(links.getAccessState, { token });
  if (!state.available) throw error(404, 'Review unavailable');
  const accessKey = cookies.get(cookieName(token));
  if (state.requiresPasscode && !accessKey) return { locked: true as const, token };
  try {
    const project = await db().query(review.getProjectByToken, { token, accessKey });
    const videos = await db().query(review.listVideosByToken, { token, accessKey });
    const reviewerName = accessKey ? await db().query(review.getReviewerName, { token, accessKey }) : undefined;
    const comments = await Promise.all(videos.map(async (video) => ({
      videoId: video.id,
      items: await db().query(review.listCommentsByVideo, { token, accessKey, videoId: video.id })
    })));
    return { locked: false as const, token, project, videos, comments, reviewerName };
  } catch {
    if (state.requiresPasscode) return { locked: true as const, token };
    throw error(404, 'Review unavailable');
  }
};

export const actions: Actions = {
  unlock: async ({ params, request, cookies }) => {
    const form = await request.formData();
    const result = await db().mutation(links.verifyPasscode, { token: params.token, passcode: String(form.get('passcode') ?? '') });
    if (!result.ok || !result.accessKey) return fail(401, { invalid: true });
    cookies.set(cookieName(params.token), result.accessKey, { path: '/', secure: !dev, httpOnly: true,
      sameSite: 'lax', maxAge: 24 * 60 * 60 });
    redirect(303, `/review/${params.token}`);
  },
  comment: async ({ params, request, cookies }) => {
    const form = await request.formData();
    const body = String(form.get('body') ?? '').trim();
    if (!body || body.length > 5000) return fail(400, { commentInvalid: true });
    const videoId = String(form.get('videoId')) as Id<'videos'>;
    await db().mutation(review.clientAddComment, { token: params.token, accessKey: cookies.get(cookieName(params.token)), videoId, body });
    redirect(303, `/review/${params.token}#${videoId}`);
  },
  name: async ({ params, request, cookies }) => {
    const accessKey = cookies.get(cookieName(params.token));
    if (!accessKey) throw error(401, 'Reviewer session required');
    const form = await request.formData();
    await db().mutation(review.setReviewerName, { token: params.token, accessKey, displayName: String(form.get('displayName') ?? '') });
    redirect(303, `/review/${params.token}`);
  }
};

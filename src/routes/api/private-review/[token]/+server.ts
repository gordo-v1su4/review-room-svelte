import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { db, review } from '$lib/server/personal';

export const POST: RequestHandler = async ({ params, cookies, request, url }) => {
  if (request.headers.get('origin') !== url.origin) throw error(403, 'Review unavailable');
  const body = await request.json();
  const scope = { token: params.token, accessKey: cookies.get(`rr_review_${params.token.slice(0, 24)}`), videoId: String(body.assetId) as Id<'videos'> };
  try {
    switch (body.action) {
      case 'viewed': await db().mutation(review.clientMarkViewed, scope); break;
      case 'rating': await db().mutation(review.clientSetRating, { ...scope, rating: body.rating }); break;
      case 'shortlist': await db().mutation(review.clientToggleSelect, scope); break;
      case 'status': await db().mutation(review.clientSetStatus, { ...scope, status: body.status }); break;
      case 'annotations': await db().mutation(review.clientSaveAnnotations, { ...scope, strokes: body.strokes }); break;
      case 'comment': await db().mutation(review.clientAddComment, { ...scope, body: body.body, requestId: body.requestId, timecodeSec: body.timecodeSec }); break;
      default: throw error(400, 'Unsupported review action');
    }
  } catch { throw error(404, 'Review unavailable'); }
  return json({ ok: true }, { headers: { 'cache-control': 'private, no-store' } });
};

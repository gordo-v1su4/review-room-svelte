import type { RequestHandler } from './$types';
import { internal } from '../../../../../../../convex/_generated/api';
import { db, mediaResponse } from '$lib/server/personal';
import { createDestinationMediaHandler } from '$lib/server/destination-media';

const handle = createDestinationMediaHandler(
  args => db().query(internal.publicationGrants.resolve, args),
  (request, key, mimeType) => mediaResponse(key, mimeType, request),
);
export const GET: RequestHandler = ({ request, params }) => handle(request, params);
export const HEAD = GET;
export const OPTIONS = GET;

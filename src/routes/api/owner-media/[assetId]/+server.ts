import type { RequestHandler } from './$types';
import { requireOwner } from '$lib/server/owner-auth';
import { ownerMediaResponse } from '$lib/server/owner-media';

export const GET: RequestHandler = async ({ params, cookies, request, url }) => {
  requireOwner(cookies);
  return ownerMediaResponse(params.assetId, false, url, request);
};

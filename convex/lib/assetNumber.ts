import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/** Reserve one number across every project owned by this workspace account. */
export async function reserveAssetNumber(ctx: MutationCtx, ownerId: Id<'appUsers'>) {
  const owner = await ctx.db.get(ownerId);
  if (!owner) throw new Error('Workspace owner unavailable');
  let number = owner.nextAssetNumber;
  if (number === undefined) {
    const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', ownerId)).collect();
    let highest = 0;
    for (const project of projects) {
      highest = Math.max(highest, (project.nextAssetNumber ?? 1) - 1);
      const assets = await ctx.db.query('videos').withIndex('by_project', q => q.eq('projectId', project._id)).collect();
      for (const asset of assets) highest = Math.max(highest, asset.assetNumber ?? 0);
    }
    number = highest + 1;
  }
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Asset sequence exhausted');
  await ctx.db.patch(ownerId, { nextAssetNumber: number + 1 });
  return number;
}

import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");
  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (!appUser || appUser.role !== "admin") throw new Error("Admin required");
  return appUser;
}

export async function getProjectForAdmin(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const admin = await requireAdmin(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.archived) throw new Error("Project not found");
  if (project.createdBy !== admin._id) throw new Error("Forbidden");
  return { admin, project };
}

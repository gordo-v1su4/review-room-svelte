import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type ProjectAccessRole = "owner" | "editor" | "viewer";

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

export async function getAdminOrNull(ctx: QueryCtx | MutationCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) return null;
  const appUser = await ctx.db
    .query("appUsers")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  return appUser?.role === "admin" ? appUser : null;
}

function matchesAccessPattern(email: string | undefined, pattern: string) {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split("@")[1];
  const normalizedPattern = pattern.toLowerCase().trim();
  if (normalizedPattern.includes("@") && !normalizedPattern.startsWith("*@")) {
    return normalizedEmail === normalizedPattern;
  }
  const patternDomain = normalizedPattern.replace(/^\*@/, "").replace(/^@/, "");
  return domain === patternDomain;
}

export async function getProjectForAdmin(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const admin = await requireAdmin(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.archived) throw new Error("Project not found");
  if (project.createdBy === admin._id) {
    return { admin, project, isOwner: true as const, memberRole: "owner" as const };
  }

  const membership = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", project._id).eq("appUserId", admin._id),
    )
    .unique();
  const explicitPrivate = project.visibility === "private";
  if (membership && !explicitPrivate) {
    return {
      admin,
      project,
      isOwner: false as const,
      memberRole: membership.role,
    };
  }

  const authUser = await ctx.db.get(admin.authUserId);
  const accessRules = await ctx.db
    .query("projectAccessRules")
    .withIndex("by_project", (q) => q.eq("projectId", project._id))
    .collect();
  const matchingRule = accessRules.find((rule) =>
    matchesAccessPattern(authUser?.email, rule.pattern),
  );
  if (matchingRule && !explicitPrivate) {
    return {
      admin,
      project,
      isOwner: false as const,
      memberRole: matchingRule.role,
    };
  }

  if (project.visibility === "workspace") {
    return {
      admin,
      project,
      isOwner: false as const,
      memberRole: "viewer" as const,
    };
  }

  throw new Error("Forbidden");
}

export async function getProjectForEditor(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const access = await getProjectForAdmin(ctx, projectId);
  if (access.memberRole === "viewer") throw new Error("Project editor required");
  return access;
}

export async function getProjectForRole(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  role: ProjectAccessRole,
) {
  if (role === "owner") return await getProjectForOwner(ctx, projectId);
  const access = await getProjectForAdmin(ctx, projectId);
  if (role === "editor" && access.memberRole === "viewer") {
    throw new Error("Project editor required");
  }
  return {
    admin: access.admin,
    project: access.project,
  };
}

export async function getProjectForOwner(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const admin = await requireAdmin(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.archived) throw new Error("Project not found");
  if (project.createdBy !== admin._id) throw new Error("Project owner required");
  return { admin, project };
}

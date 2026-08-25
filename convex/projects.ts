import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAppUserOrNull,
  getAdminOrNull,
  getProjectForAdmin,
  getProjectForEditor,
  getProjectForOwner,
  requireAdmin,
} from "./lib/access";

const memberRoleValidator = v.union(v.literal("editor"), v.literal("viewer"));
const projectVisibilityValidator = v.union(
  v.literal("private"),
  v.literal("shared"),
  v.literal("workspace"),
);

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
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

function normalizeAccessPattern(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("*@")) return `*@${value.slice(2)}`;
  if (value.startsWith("@")) return `*@${value.slice(1)}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return `*@${value}`;
  return null;
}

function accessPatternLabel(pattern: string) {
  return pattern.startsWith("*@") ? pattern : pattern;
}

function normalizeAccessRuleList(value: string[] | undefined) {
  return Array.from(
    new Set(
      (value ?? [])
        .map((entry) => normalizeAccessPattern(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAppUserOrNull(ctx);
    if (!admin) return [];
    const authUser = await ctx.db.get(admin.authUserId);
    const owned = await ctx.db
      .query("projects")
      .withIndex("by_creator", (q) => q.eq("createdBy", admin._id))
      .collect();
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("appUserId", admin._id))
      .collect();
    const shared = await Promise.all(
      memberships.map((membership) => ctx.db.get(membership.projectId)),
    );
    const accessRules = await ctx.db.query("projectAccessRules").collect();
    const ruleProjects = await Promise.all(
      accessRules
        .filter((rule) => matchesAccessPattern(authUser?.email, rule.pattern))
        .map((rule) => ctx.db.get(rule.projectId)),
    );
    const workspaceProjects = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("visibility"), "workspace"))
      .collect();
    const projectsById = new Map(
      [
        ...owned,
        ...shared.filter((project) => project !== null),
        ...ruleProjects.filter((project) => project !== null),
        ...workspaceProjects,
      ].map((project) => [project._id, project]),
    );
    const projects = Array.from(projectsById.values());
    const active = projects.filter((p) => !p.archived);
    const enriched = await Promise.all(
      active.map(async (project) => {
        const videos = await ctx.db
          .query("videos")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const visible = videos.filter((v) => v.status !== "archived");
        return {
          ...project,
          isOwner: project.createdBy === admin._id,
          visibility: project.visibility ?? "private",
          videoCount: visible.length,
          awaitingReview: visible.filter(
            (v) => v.status === "awaiting_review" && !v.viewed,
          ).length,
          feedbackCount: visible.filter((v) => v.commentCount > 0).length,
        };
      }),
    );
    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project, isOwner, memberRole } = await getProjectForAdmin(
      ctx,
      args.projectId,
    );
    return {
      ...project,
      visibility: project.visibility ?? "private",
      isOwner,
      memberRole,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    downloadEnabledByDefault: v.optional(v.boolean()),
    visibility: v.optional(projectVisibilityValidator),
    accessRules: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const normalizedRules = normalizeAccessRuleList(args.accessRules);
    const visibility =
      normalizedRules.length > 0 && args.visibility !== "workspace"
        ? "shared"
        : args.visibility ?? "private";
    let slug = slugify(args.title);
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) slug = `${slug}-${now}`;
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      slug,
      clientName: args.clientName,
      description: args.description,
      brandColor: args.brandColor,
      downloadEnabledByDefault: args.downloadEnabledByDefault ?? false,
      visibility,
      nextAssetNumber: 1,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
    for (const pattern of normalizedRules) {
      await ctx.db.insert("projectAccessRules", {
        projectId,
        pattern,
        role: "viewer",
        addedBy: admin._id,
        addedAt: now,
      });
    }
    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    bannerKey: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    downloadEnabledByDefault: v.optional(v.boolean()),
    clearClientName: v.optional(v.boolean()),
    clearDescription: v.optional(v.boolean()),
    clearBanner: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { project } = await getProjectForEditor(ctx, args.projectId);
    const {
      projectId: _pid,
      clearClientName,
      clearDescription,
      clearBanner,
      ...patch
    } = args;
    const nextPatch: Record<string, unknown> = { ...patch };
    if (clearClientName) nextPatch.clientName = undefined;
    if (clearDescription) nextPatch.description = undefined;
    if (clearBanner) nextPatch.bannerKey = undefined;
    await ctx.db.patch(project._id, { ...nextPatch, updatedAt: Date.now() });
  },
});

export const setVisibility = mutation({
  args: {
    projectId: v.id("projects"),
    visibility: projectVisibilityValidator,
  },
  handler: async (ctx, args) => {
    const { project } = await getProjectForOwner(ctx, args.projectId);
    await ctx.db.patch(project._id, {
      visibility: args.visibility,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getProjectForOwner(ctx, args.projectId);
    await ctx.db.patch(project._id, { archived: true, updatedAt: Date.now() });
  },
});

export const unarchive = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.createdBy !== admin._id) throw new Error("Project owner required");
    await ctx.db.patch(project._id, {
      archived: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const listMembers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getProjectForAdmin(ctx, args.projectId);
    const owner = await ctx.db.get(project.createdBy);
    const ownerAuthUser = owner ? await ctx.db.get(owner.authUserId) : null;
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const accessRules = await ctx.db
      .query("projectAccessRules")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const appUser = await ctx.db.get(membership.appUserId);
        const authUser = appUser ? await ctx.db.get(appUser.authUserId) : null;
        return {
          entryKey: `member:${membership._id}`,
          membershipId: membership._id,
          ruleId: undefined,
          appUserId: membership.appUserId,
          name: appUser?.name ?? authUser?.name ?? "User",
          email: authUser?.email,
          role: membership.role,
          isOwner: false,
          isRule: false,
        };
      }),
    );
    const rules = accessRules.map((rule) => ({
      entryKey: `rule:${rule._id}`,
      membershipId: undefined,
      ruleId: rule._id,
      appUserId: undefined,
      name: accessPatternLabel(rule.pattern),
      email: "Email rule",
      role: rule.role,
      isOwner: false,
      isRule: true,
    }));

    return [
      {
        entryKey: `owner:${project.createdBy}`,
        membershipId: null,
        ruleId: undefined,
        appUserId: project.createdBy,
        name: owner?.name ?? ownerAuthUser?.name ?? "Owner",
        email: ownerAuthUser?.email,
        role: "owner",
        isOwner: true,
        isRule: false,
      },
      ...members,
      ...rules,
    ];
  },
});

export const addMember = mutation({
  args: {
    projectId: v.id("projects"),
    identifier: v.string(),
    role: v.optional(memberRoleValidator),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForOwner(ctx, args.projectId);
    const identifier = args.identifier.trim().toLowerCase();
    if (!identifier) throw new Error("Enter a user email or name");

    const appUsers = await ctx.db.query("appUsers").collect();
    let target: (typeof appUsers)[number] | null = null;

    for (const appUser of appUsers) {
      const authUser = await ctx.db.get(appUser.authUserId);
      const email = authUser?.email?.toLowerCase();
      const authName = authUser?.name?.toLowerCase();
      const appName = appUser.name.toLowerCase();
      if (email === identifier || authName === identifier || appName === identifier) {
        target = appUser;
        break;
      }
    }

    if (!target) {
      const pattern = normalizeAccessPattern(identifier);
      if (!pattern) {
        throw new Error("No signed-in user matches that name. Use an email or *@domain.com for a rule.");
      }
      const existingRule = await ctx.db
        .query("projectAccessRules")
        .withIndex("by_project_pattern", (q) =>
          q.eq("projectId", project._id).eq("pattern", pattern),
        )
        .unique();
      if (existingRule) {
        await ctx.db.patch(existingRule._id, { role: args.role ?? "editor" });
        if (project.visibility !== "workspace") {
          await ctx.db.patch(project._id, {
            visibility: "shared",
            updatedAt: Date.now(),
          });
        }
        return existingRule._id;
      }
      const ruleId = await ctx.db.insert("projectAccessRules", {
        projectId: project._id,
        pattern,
        role: args.role ?? "editor",
        addedBy: admin._id,
        addedAt: Date.now(),
      });
      if (project.visibility !== "workspace") {
        await ctx.db.patch(project._id, {
          visibility: "shared",
          updatedAt: Date.now(),
        });
      }
      return ruleId;
    }
    if (target._id === project.createdBy) {
      throw new Error("That user already owns this project");
    }

    const existing = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", project._id).eq("appUserId", target._id),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role ?? "editor" });
      if (project.visibility !== "workspace") {
        await ctx.db.patch(project._id, {
          visibility: "shared",
          updatedAt: Date.now(),
        });
      }
      return existing._id;
    }

    const membershipId = await ctx.db.insert("projectMembers", {
      projectId: project._id,
      appUserId: target._id,
      role: args.role ?? "editor",
      addedBy: admin._id,
      addedAt: Date.now(),
    });
    if (project.visibility !== "workspace") {
      await ctx.db.patch(project._id, {
        visibility: "shared",
        updatedAt: Date.now(),
      });
    }
    return membershipId;
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("projectMembers") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) return;
    await getProjectForOwner(ctx, membership.projectId);
    await ctx.db.delete(args.membershipId);
  },
});

export const removeAccessRule = mutation({
  args: { ruleId: v.id("projectAccessRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) return;
    await getProjectForOwner(ctx, rule.projectId);
    await ctx.db.delete(args.ruleId);
  },
});

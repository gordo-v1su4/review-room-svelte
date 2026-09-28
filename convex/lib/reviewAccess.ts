import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function passcodeDigest(passcode: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, ["deriveBits"]);
  const bytes = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120_000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getReviewLink(ctx: Ctx, token: string, accessKey?: string) {
  const link = await ctx.db.query("reviewLinks").withIndex("by_token", (q) => q.eq("token", token)).unique();
  if (!link || link.revokedAt || (link.expiresAt !== undefined && link.expiresAt <= Date.now())) {
    throw new Error("Review link unavailable");
  }
  const project = await ctx.db.get(link.projectId);
  if (!project || project.archived) throw new Error("Review link unavailable");
  if (link.passcodeHash) {
    if (!accessKey || !/^[0-9a-f]{64}$/.test(accessKey)) throw new Error("Review link locked");
    const accessKeyHash = await digest(accessKey);
    const session = await ctx.db.query("reviewerSessions")
      .withIndex("by_token_access_key_hash", (q) => q.eq("token", token).eq("accessKeyHash", accessKeyHash))
      .unique();
    if (!session || session.expiresAt <= Date.now()) throw new Error("Review link locked");
  }
  return { link, project };
}

export async function getReviewerSession(ctx: Ctx, token: string, accessKey: string) {
  if (!/^[0-9a-f]{64}$/.test(accessKey)) throw new Error("Reviewer session unavailable");
  const accessKeyHash = await digest(accessKey);
  const session = await ctx.db.query("reviewerSessions")
    .withIndex("by_token_access_key_hash", (q) => q.eq("token", token).eq("accessKeyHash", accessKeyHash))
    .unique();
  if (!session || session.expiresAt <= Date.now()) throw new Error("Reviewer session unavailable");
  return session;
}

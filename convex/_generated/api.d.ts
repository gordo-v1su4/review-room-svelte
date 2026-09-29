/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as collections from "../collections.js";
import type * as comments from "../comments.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_assetNumber from "../lib/assetNumber.js";
import type * as lib_passwordReset from "../lib/passwordReset.js";
import type * as lib_reviewAccess from "../lib/reviewAccess.js";
import type * as mediaJobs from "../mediaJobs.js";
import type * as personal from "../personal.js";
import type * as projects from "../projects.js";
import type * as reviewLinks from "../reviewLinks.js";
import type * as reviewPublic from "../reviewPublic.js";
import type * as videos from "../videos.js";
import type * as videosInternal from "../videosInternal.js";
import type * as workspacePreferences from "../workspacePreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  collections: typeof collections;
  comments: typeof comments;
  folders: typeof folders;
  http: typeof http;
  inbox: typeof inbox;
  "lib/access": typeof lib_access;
  "lib/assetNumber": typeof lib_assetNumber;
  "lib/passwordReset": typeof lib_passwordReset;
  "lib/reviewAccess": typeof lib_reviewAccess;
  mediaJobs: typeof mediaJobs;
  personal: typeof personal;
  projects: typeof projects;
  reviewLinks: typeof reviewLinks;
  reviewPublic: typeof reviewPublic;
  videos: typeof videos;
  videosInternal: typeof videosInternal;
  workspacePreferences: typeof workspacePreferences;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

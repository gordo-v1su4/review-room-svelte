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
import type * as automation from "../automation.js";
import type * as collections from "../collections.js";
import type * as comments from "../comments.js";
import type * as destinationDelivery from "../destinationDelivery.js";
import type * as destinationRefresh from "../destinationRefresh.js";
import type * as destinationRemovals from "../destinationRemovals.js";
import type * as destinationSync from "../destinationSync.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_archivePurge from "../lib/archivePurge.js";
import type * as lib_assetNumber from "../lib/assetNumber.js";
import type * as lib_folderTree from "../lib/folderTree.js";
import type * as lib_passwordReset from "../lib/passwordReset.js";
import type * as lib_personalCommands from "../lib/personalCommands.js";
import type * as lib_reviewAccess from "../lib/reviewAccess.js";
import type * as lib_sourceImport from "../lib/sourceImport.js";
import type * as lib_versionMetadata from "../lib/versionMetadata.js";
import type * as mediaJobs from "../mediaJobs.js";
import type * as personal from "../personal.js";
import type * as privateReview from "../privateReview.js";
import type * as projects from "../projects.js";
import type * as publicationGrants from "../publicationGrants.js";
import type * as reviewLinks from "../reviewLinks.js";
import type * as reviewPublic from "../reviewPublic.js";
import type * as sourceImports from "../sourceImports.js";
import type * as storageDeletion from "../storageDeletion.js";
import type * as storageDeletionWorker from "../storageDeletionWorker.js";
import type * as videos from "../videos.js";
import type * as videosInternal from "../videosInternal.js";
import type * as workActivity from "../workActivity.js";
import type * as workspacePreferences from "../workspacePreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  automation: typeof automation;
  collections: typeof collections;
  comments: typeof comments;
  destinationDelivery: typeof destinationDelivery;
  destinationRefresh: typeof destinationRefresh;
  destinationRemovals: typeof destinationRemovals;
  destinationSync: typeof destinationSync;
  folders: typeof folders;
  http: typeof http;
  inbox: typeof inbox;
  "lib/access": typeof lib_access;
  "lib/archivePurge": typeof lib_archivePurge;
  "lib/assetNumber": typeof lib_assetNumber;
  "lib/folderTree": typeof lib_folderTree;
  "lib/passwordReset": typeof lib_passwordReset;
  "lib/personalCommands": typeof lib_personalCommands;
  "lib/reviewAccess": typeof lib_reviewAccess;
  "lib/sourceImport": typeof lib_sourceImport;
  "lib/versionMetadata": typeof lib_versionMetadata;
  mediaJobs: typeof mediaJobs;
  personal: typeof personal;
  privateReview: typeof privateReview;
  projects: typeof projects;
  publicationGrants: typeof publicationGrants;
  reviewLinks: typeof reviewLinks;
  reviewPublic: typeof reviewPublic;
  sourceImports: typeof sourceImports;
  storageDeletion: typeof storageDeletion;
  storageDeletionWorker: typeof storageDeletionWorker;
  videos: typeof videos;
  videosInternal: typeof videosInternal;
  workActivity: typeof workActivity;
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

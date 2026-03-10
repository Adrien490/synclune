import { UTApi } from "uploadthing/server";

/**
 * Singleton UTApi instance for server-side UploadThing operations.
 *
 * Avoids re-instantiating UTApi on every function call.
 * Used by delete services, orphan cleanup cron, and any server-side UT operations.
 */
export const utapi = new UTApi();

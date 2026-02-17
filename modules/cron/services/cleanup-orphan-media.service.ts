import { prisma } from "@/shared/lib/prisma";
import { UTApi } from "uploadthing/server";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";
import { DB_QUERY_BATCH_SIZE, MAX_PAGES_PER_RUN, UPLOADTHING_LIST_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Cleans up orphaned UploadThing files not referenced in the database.
 *
 * Safety net for files that lost their DB reference:
 * - SkuMedia (url, thumbnailUrl)
 * - ReviewMedia (url)
 * - User.image (avatars)
 *
 * Runs monthly to limit orphan file accumulation.
 */
export async function cleanupOrphanMedia(): Promise<{
	filesScanned: number;
	orphansDeleted: number;
	errors: number;
}> {
	console.log("[CRON:cleanup-orphan-media] Starting orphan media cleanup...");

	const utapi = new UTApi();
	let filesScanned = 0;
	let orphansDeleted = 0;
	let errors = 0;

	try {
		// 1. Load all referenced file keys from DB (paginated to control memory)
		const referencedKeys = await getAllReferencedFileKeys();
		console.log(
			`[CRON:cleanup-orphan-media] Found ${referencedKeys.size} referenced keys in DB`
		);

		// 2. List UploadThing files with pagination
		let offset = 0;
		let hasMore = true;
		let pagesProcessed = 0;

		while (hasMore && pagesProcessed < MAX_PAGES_PER_RUN) {
			const response = await utapi.listFiles({
				limit: UPLOADTHING_LIST_LIMIT,
				offset,
			});
			const files = response.files;
			filesScanned += files.length;

			console.log(
				`[CRON:cleanup-orphan-media] Fetched ${files.length} files (offset: ${offset})`
			);

			if (files.length === 0) break;

			// 3. Identify orphan files in this page
			// Skip files created in the last 24h to avoid race conditions
			// (file uploaded between DB scan and UploadThing scan)
			const ageThreshold = Date.now() - 24 * 60 * 60 * 1000;
			const orphanKeys = files
				.filter(
					(f) =>
						!referencedKeys.has(f.key) &&
						new Date(f.uploadedAt).getTime() < ageThreshold
				)
				.map((f) => f.key);

			// 4. Delete orphan files from this page
			if (orphanKeys.length > 0) {
				try {
					await utapi.deleteFiles(orphanKeys);
					orphansDeleted += orphanKeys.length;
					console.log(
						`[CRON:cleanup-orphan-media] Deleted ${orphanKeys.length} orphan files`
					);
				} catch (error) {
					console.error(
						"[CRON:cleanup-orphan-media] Error deleting orphan files:",
						error instanceof Error ? error.message : String(error)
					);
					errors += orphanKeys.length;
				}
			}

			hasMore = files.length === UPLOADTHING_LIST_LIMIT;
			offset += files.length;
			pagesProcessed++;
		}

		console.log(
			`[CRON:cleanup-orphan-media] Total: ${orphansDeleted} orphans deleted out of ${filesScanned} scanned`
		);
	} catch (error) {
		console.error(
			"[CRON:cleanup-orphan-media] Error during cleanup:",
			error instanceof Error ? error.message : String(error)
		);
		errors++;
	}

	console.log("[CRON:cleanup-orphan-media] Cleanup completed");

	return {
		filesScanned,
		orphansDeleted,
		errors,
	};
}

/**
 * Loads all referenced file keys from the database using paginated queries.
 *
 * Uses cursor-based pagination to avoid loading all media records into memory
 * at once, which could be problematic as the catalogue grows.
 *
 * IMPORTANT: Each UploadThing route MUST have its files tracked in a DB table
 * and queried below. Otherwise the orphan cleanup cron will delete those files
 * as unreferenced after 24h.
 *
 * Currently tracked:
 * - catalogMedia    → SkuMedia (url, thumbnailUrl)
 * - reviewMedia     → ReviewMedia (url)
 * - (user avatars)  → User.image
 *
 * NOT tracked (routes not yet connected to any component):
 * - testimonialMedia → No DB table yet. When implementing testimonials,
 *   create a Testimonial model with an imageUrl field and add a query here.
 * - contactAttachment → Ephemeral files sent with contact form.
 *   When implementing the contact form, either track in DB or exclude from cleanup.
 */
async function getAllReferencedFileKeys(): Promise<Set<string>> {
	const keys = new Set<string>();

	// 1. SkuMedia (url and thumbnailUrl) - paginated
	let skuCursor: string | undefined;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const batch = await prisma.skuMedia.findMany({
			select: { id: true, url: true, thumbnailUrl: true },
			take: DB_QUERY_BATCH_SIZE,
			...(skuCursor && { skip: 1, cursor: { id: skuCursor } }),
			orderBy: { id: "asc" },
		});
		for (const media of batch) {
			const urlKey = extractFileKeyFromUrl(media.url);
			if (urlKey) keys.add(urlKey);
			if (media.thumbnailUrl) {
				const thumbKey = extractFileKeyFromUrl(media.thumbnailUrl);
				if (thumbKey) keys.add(thumbKey);
			}
		}
		if (batch.length < DB_QUERY_BATCH_SIZE) break;
		skuCursor = batch[batch.length - 1].id;
	}

	// 2. ReviewMedia - paginated
	let reviewCursor: string | undefined;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const batch = await prisma.reviewMedia.findMany({
			select: { id: true, url: true },
			take: DB_QUERY_BATCH_SIZE,
			...(reviewCursor && { skip: 1, cursor: { id: reviewCursor } }),
			orderBy: { id: "asc" },
		});
		for (const media of batch) {
			const key = extractFileKeyFromUrl(media.url);
			if (key) keys.add(key);
		}
		if (batch.length < DB_QUERY_BATCH_SIZE) break;
		reviewCursor = batch[batch.length - 1].id;
	}

	// 3. User avatars (only those with non-null image) - paginated
	let userCursor: string | undefined;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const batch = await prisma.user.findMany({
			where: { image: { not: null } },
			select: { id: true, image: true },
			take: DB_QUERY_BATCH_SIZE,
			...(userCursor && { skip: 1, cursor: { id: userCursor } }),
			orderBy: { id: "asc" },
		});
		for (const user of batch) {
			if (user.image) {
				const key = extractFileKeyFromUrl(user.image);
				if (key) keys.add(key);
			}
		}
		if (batch.length < DB_QUERY_BATCH_SIZE) break;
		userCursor = batch[batch.length - 1].id;
	}

	return keys;
}

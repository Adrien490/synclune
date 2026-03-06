import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { UTApi } from "uploadthing/server";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";
import {
	BATCH_DEADLINE_MS,
	DB_QUERY_BATCH_SIZE,
	MAX_PAGES_PER_RUN,
	UPLOADTHING_LIST_LIMIT,
} from "@/modules/cron/constants/limits";

/**
 * Cleans up orphaned UploadThing files not referenced in the database.
 *
 * Safety net for files that lost their DB reference:
 * - SkuMedia (url, thumbnailUrl)
 * - ReviewMedia (url)
 * - CustomizationMedia (url)
 * - User.image (avatars)
 * - Testimonial.imageUrl
 *
 * Runs monthly to limit orphan file accumulation.
 */
export async function cleanupOrphanMedia(): Promise<{
	filesScanned: number;
	orphansDeleted: number;
	errors: number;
}> {
	logger.info("Starting orphan media cleanup", { cronJob: "cleanup-orphan-media" });

	const utapi = new UTApi();
	let filesScanned = 0;
	let orphansDeleted = 0;
	let errors = 0;

	const deadline = Date.now() + BATCH_DEADLINE_MS;

	try {
		// 1. Load all referenced file keys from DB (paginated to control memory)
		const referencedKeys = await getAllReferencedFileKeys(deadline);
		logger.info("Found referenced keys in DB", {
			cronJob: "cleanup-orphan-media",
			count: referencedKeys.size,
		});

		// 2. List UploadThing files with pagination
		let offset = 0;
		let hasMore = true;
		let pagesProcessed = 0;

		while (hasMore && pagesProcessed < MAX_PAGES_PER_RUN && Date.now() < deadline) {
			const response = await utapi.listFiles({
				limit: UPLOADTHING_LIST_LIMIT,
				offset,
			});
			const files = response.files;
			filesScanned += files.length;

			logger.info("Fetched files from UploadThing", {
				cronJob: "cleanup-orphan-media",
				count: files.length,
				offset,
			});

			if (files.length === 0) break;

			// 3. Identify orphan files in this page
			// Skip files created in the last 24h to avoid race conditions
			// (file uploaded between DB scan and UploadThing scan)
			const ageThreshold = Date.now() - 24 * 60 * 60 * 1000;
			const orphanKeys = files
				.filter(
					(f) => !referencedKeys.has(f.key) && new Date(f.uploadedAt).getTime() < ageThreshold,
				)
				.map((f) => f.key);

			// 4. Delete orphan files from this page
			if (orphanKeys.length > 0) {
				try {
					await utapi.deleteFiles(orphanKeys);
					orphansDeleted += orphanKeys.length;
					logger.info("Deleted orphan files", {
						cronJob: "cleanup-orphan-media",
						count: orphanKeys.length,
					});
				} catch (error) {
					logger.error("Error deleting orphan files", error, { cronJob: "cleanup-orphan-media" });
					errors += orphanKeys.length;
				}
			}

			hasMore = files.length === UPLOADTHING_LIST_LIMIT;
			offset += files.length;
			pagesProcessed++;
		}

		logger.info("Orphan media scan completed", {
			cronJob: "cleanup-orphan-media",
			orphansDeleted,
			filesScanned,
		});
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-orphan-media" });
		// Re-throw to signal total failure to the route handler (returns cronError/500)
		// A DB failure during key scan means we can't safely determine orphans
		throw error;
	}

	logger.info("Cleanup completed", { cronJob: "cleanup-orphan-media" });

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
 * - catalogMedia        → SkuMedia (url, thumbnailUrl)
 * - reviewMedia         → ReviewMedia (url)
 * - customizationMedia  → CustomizationMedia (url)
 * - (user avatars)      → User.image
 * - testimonialMedia    → Testimonial (imageUrl)
 *
 * Note: contactAttachment is ephemeral by design (forwarded via email). 24h guard sufficient.
 */
async function getAllReferencedFileKeys(deadline: number): Promise<Set<string>> {
	const keys = new Set<string>();

	// 1. SkuMedia (url and thumbnailUrl) - paginated
	let skuCursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during DB key scan, aborting safely", {
				cronJob: "cleanup-orphan-media",
			});
			throw new Error("Deadline exceeded during DB key scan");
		}
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
		skuCursor = batch[batch.length - 1]!.id;
	}

	// 2. ReviewMedia - paginated
	let reviewCursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during DB key scan, aborting safely", {
				cronJob: "cleanup-orphan-media",
			});
			throw new Error("Deadline exceeded during DB key scan");
		}
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
		reviewCursor = batch[batch.length - 1]!.id;
	}

	// 3. CustomizationMedia - paginated
	let customizationCursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during DB key scan, aborting safely", {
				cronJob: "cleanup-orphan-media",
			});
			throw new Error("Deadline exceeded during DB key scan");
		}
		const batch = await prisma.customizationMedia.findMany({
			select: { id: true, url: true },
			take: DB_QUERY_BATCH_SIZE,
			...(customizationCursor && { skip: 1, cursor: { id: customizationCursor } }),
			orderBy: { id: "asc" },
		});
		for (const media of batch) {
			const key = extractFileKeyFromUrl(media.url);
			if (key) keys.add(key);
		}
		if (batch.length < DB_QUERY_BATCH_SIZE) break;
		customizationCursor = batch[batch.length - 1]!.id;
	}

	// 4. Testimonial images - paginated
	let testimonialCursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during DB key scan, aborting safely", {
				cronJob: "cleanup-orphan-media",
			});
			throw new Error("Deadline exceeded during DB key scan");
		}
		const batch = await prisma.testimonial.findMany({
			where: { imageUrl: { not: null } },
			select: { id: true, imageUrl: true },
			take: DB_QUERY_BATCH_SIZE,
			...(testimonialCursor && { skip: 1, cursor: { id: testimonialCursor } }),
			orderBy: { id: "asc" },
		});
		for (const t of batch) {
			if (t.imageUrl) {
				const key = extractFileKeyFromUrl(t.imageUrl);
				if (key) keys.add(key);
			}
		}
		if (batch.length < DB_QUERY_BATCH_SIZE) break;
		testimonialCursor = batch[batch.length - 1]!.id;
	}

	// 5. User avatars (only those with non-null image) - paginated
	let userCursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during DB key scan, aborting safely", {
				cronJob: "cleanup-orphan-media",
			});
			throw new Error("Deadline exceeded during DB key scan");
		}
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
		userCursor = batch[batch.length - 1]!.id;
	}

	return keys;
}

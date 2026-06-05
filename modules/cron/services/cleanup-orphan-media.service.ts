import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { utapi } from "@/shared/lib/uploadthing";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";
import {
	BATCH_DEADLINE_MS,
	DB_QUERY_BATCH_SIZE,
	MAX_PAGES_PER_RUN,
	UPLOADTHING_LIST_LIMIT,
} from "@/modules/cron/constants/limits";
import { CronDeadlineExceededError, type CronResult } from "@/modules/cron/lib/cron-result";
import { paginateCursor } from "@/modules/cron/lib/paginate-cursor";

class UploadThingTimeoutError extends Error {
	constructor(operation: string, timeoutMs: number) {
		super(`UploadThing ${operation} exceeded deadline (${timeoutMs}ms)`);
		this.name = "UploadThingTimeoutError";
	}
}

/**
 * Promise.race wrapper for UploadThing calls.
 *
 * UploadThing SDK v7 only supports `AbortSignal` on uploads (cf
 * `node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts:382`), NOT on
 * `listFiles` / `deleteFiles` (their option types `ListFilesOptions` /
 * `DeleteFilesOptions` don't extend any signal-bearing interface). We bound
 * each call to the remaining deadline manually so a hanging UploadThing
 * incident doesn't blow past the 45s `BATCH_DEADLINE_MS` and trigger a
 * spurious Vercel 60s timeout + admin alert.
 *
 * On timeout we throw a typed error caught upstream as a clean break with
 * `hasMore: true` — the next monthly run will pick up the orphans.
 */
async function withDeadline<T>(
	promise: Promise<T>,
	deadline: number,
	operation: string,
): Promise<T> {
	const timeoutMs = Math.max(0, deadline - Date.now());
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new UploadThingTimeoutError(operation, timeoutMs));
		}, timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

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
export async function cleanupOrphanMedia(): Promise<CronResult> {
	logger.info("Starting orphan media cleanup", { cronJob: "cleanup-orphan-media" });

	let filesScanned = 0;
	let orphansDeleted = 0;
	let errors = 0;
	let hasMore = false;

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
		hasMore = true;
		let pagesProcessed = 0;

		while (hasMore && pagesProcessed < MAX_PAGES_PER_RUN && Date.now() < deadline) {
			let response: Awaited<ReturnType<typeof utapi.listFiles>>;
			try {
				response = await withDeadline(
					utapi.listFiles({
						limit: UPLOADTHING_LIST_LIMIT,
						offset,
					}),
					deadline,
					"listFiles",
				);
			} catch (error) {
				if (error instanceof UploadThingTimeoutError) {
					logger.warn("UploadThing listFiles timed out — resumable next run", {
						cronJob: "cleanup-orphan-media",
						pagesProcessed,
						offset,
					});
					hasMore = true;
					break;
				}
				throw error;
			}
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
					await withDeadline(utapi.deleteFiles(orphanKeys), deadline, "deleteFiles");
					orphansDeleted += orphanKeys.length;
					logger.info("Deleted orphan files", {
						cronJob: "cleanup-orphan-media",
						count: orphanKeys.length,
					});
				} catch (error) {
					if (error instanceof UploadThingTimeoutError) {
						logger.warn("UploadThing deleteFiles timed out — resumable next run", {
							cronJob: "cleanup-orphan-media",
							pagesProcessed,
							pendingKeys: orphanKeys.length,
						});
						hasMore = true;
						break;
					}
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
		// Deadline hit during DB key scan : rethrow enriched with partial counts so
		// `withCronGuard` can return HTTP 200 + `hasMore: true` (resumable, no alert).
		if (error instanceof CronDeadlineExceededError) {
			throw new CronDeadlineExceededError(error.message, {
				processed: orphansDeleted,
				errored: errors,
				// skipped = files protected by 24h race-condition guard or not orphan
				skipped: Math.max(0, filesScanned - orphansDeleted - errors),
				step: error.partial.step,
				filesScanned,
				orphansDeleted,
				errors,
			});
		}
		logger.error("Error during cleanup", error, { cronJob: "cleanup-orphan-media" });
		// Re-throw real failures (DB unavailable, UploadThing 5xx) so the middleware
		// returns 500 + admin alert.
		throw error;
	}

	logger.info("Cleanup completed", { cronJob: "cleanup-orphan-media" });

	return {
		processed: orphansDeleted,
		errored: errors,
		// skipped = files protected by 24h race-condition guard or not orphan
		skipped: Math.max(0, filesScanned - orphansDeleted - errors),
		// `hasMore` propagates either (a) a natural page-full UploadThing list
		// (more files exist past `MAX_PAGES_PER_RUN * UPLOADTHING_LIST_LIMIT`)
		// or (b) a timeout-triggered break (cf `withDeadline` above) so the
		// next monthly run resumes from a clean slate.
		hasMore,
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
 * - (user avatars)      → User.image
 * - order snapshots     → OrderItem (productImageUrl, skuImageUrl)
 * - invoice archives    → Order (invoicePdfUrl, creditNotePdfUrl)
 *
 * MEDIA-AUDIT-003 : les snapshots de commande (`OrderItem.productImageUrl` /
 * `skuImageUrl`) figent l'URL du media au checkout. Si la ligne `SkuMedia`
 * source disparait, le fichier ne doit PAS être supprimé tant qu'une commande
 * y fait référence — sinon l'historique client afficherait une image 404
 * (rétention légale 10 ans).
 *
 * RGPD-AUDIT F-C : les PDF de facture/avoir archivés (`Order.invoicePdfUrl` /
 * `creditNotePdfUrl`) sont des archives légales immuables conservées 10 ans
 * (Art. L102 B LPF). SANS ce scan, ce cron les classerait orphelins et les
 * supprimerait dès 24h — destruction d'archives fiscales encore dans leur
 * rétention. Ce scan DOIT précéder toute réactivation du cron (actuellement retiré).
 */
async function getAllReferencedFileKeys(deadline: number): Promise<Set<string>> {
	const keys = new Set<string>();
	const jobName = "cleanup-orphan-media";

	// 1. SkuMedia (url and thumbnailUrl)
	await paginateCursor({
		jobName,
		step: "skuMedia-scan",
		batchSize: DB_QUERY_BATCH_SIZE,
		deadline,
		fetch: (cursor, take) =>
			prisma.skuMedia.findMany({
				select: { id: true, url: true, thumbnailUrl: true },
				take,
				...(cursor && { skip: 1, cursor: { id: cursor } }),
				orderBy: { id: "asc" },
			}),
		onBatch: (batch) => {
			for (const media of batch) {
				const urlKey = extractFileKeyFromUrl(media.url);
				if (urlKey) keys.add(urlKey);
				if (media.thumbnailUrl) {
					const thumbKey = extractFileKeyFromUrl(media.thumbnailUrl);
					if (thumbKey) keys.add(thumbKey);
				}
			}
		},
	});

	// 2. ReviewMedia
	await paginateCursor({
		jobName,
		step: "reviewMedia-scan",
		batchSize: DB_QUERY_BATCH_SIZE,
		deadline,
		fetch: (cursor, take) =>
			prisma.reviewMedia.findMany({
				select: { id: true, url: true },
				take,
				...(cursor && { skip: 1, cursor: { id: cursor } }),
				orderBy: { id: "asc" },
			}),
		onBatch: (batch) => {
			for (const media of batch) {
				const key = extractFileKeyFromUrl(media.url);
				if (key) keys.add(key);
			}
		},
	});

	// 3. User avatars (only those with non-null image)
	await paginateCursor({
		jobName,
		step: "userAvatar-scan",
		batchSize: DB_QUERY_BATCH_SIZE,
		deadline,
		fetch: (cursor, take) =>
			prisma.user.findMany({
				where: { image: { not: null } },
				select: { id: true, image: true },
				take,
				...(cursor && { skip: 1, cursor: { id: cursor } }),
				orderBy: { id: "asc" },
			}),
		onBatch: (batch) => {
			for (const user of batch) {
				if (user.image) {
					const key = extractFileKeyFromUrl(user.image);
					if (key) keys.add(key);
				}
			}
		},
	});

	// 4. Order snapshots (MEDIA-AUDIT-003) — productImageUrl + skuImageUrl.
	// Protège l'intégrité historique : un fichier encore référencé par une
	// commande passée ne doit jamais être considéré orphelin.
	await paginateCursor({
		jobName,
		step: "orderItem-snapshot-scan",
		batchSize: DB_QUERY_BATCH_SIZE,
		deadline,
		fetch: (cursor, take) =>
			prisma.orderItem.findMany({
				where: { OR: [{ productImageUrl: { not: null } }, { skuImageUrl: { not: null } }] },
				select: { id: true, productImageUrl: true, skuImageUrl: true },
				take,
				...(cursor && { skip: 1, cursor: { id: cursor } }),
				orderBy: { id: "asc" },
			}),
		onBatch: (batch) => {
			for (const item of batch) {
				if (item.productImageUrl) {
					const key = extractFileKeyFromUrl(item.productImageUrl);
					if (key) keys.add(key);
				}
				if (item.skuImageUrl) {
					const key = extractFileKeyFromUrl(item.skuImageUrl);
					if (key) keys.add(key);
				}
			}
		},
	});

	// 5. Order invoice/credit-note PDF archives (RGPD-AUDIT F-C) — immutable legal
	// documents kept 10 years (Art. L102 B LPF). They are deleted ONLY by the
	// `hard-delete-retention` cron at paidAt+10y; until then they must never be
	// classified as orphans.
	await paginateCursor({
		jobName,
		step: "orderInvoicePdf-scan",
		batchSize: DB_QUERY_BATCH_SIZE,
		deadline,
		fetch: (cursor, take) =>
			prisma.order.findMany({
				where: { OR: [{ invoicePdfUrl: { not: null } }, { creditNotePdfUrl: { not: null } }] },
				select: { id: true, invoicePdfUrl: true, creditNotePdfUrl: true },
				take,
				...(cursor && { skip: 1, cursor: { id: cursor } }),
				orderBy: { id: "asc" },
			}),
		onBatch: (batch) => {
			for (const order of batch) {
				if (order.invoicePdfUrl) {
					const key = extractFileKeyFromUrl(order.invoicePdfUrl);
					if (key) keys.add(key);
				}
				if (order.creditNotePdfUrl) {
					const key = extractFileKeyFromUrl(order.creditNotePdfUrl);
					if (key) keys.add(key);
				}
			}
		},
	});

	return keys;
}

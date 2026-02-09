import { prisma } from "@/shared/lib/prisma";
import { UTApi } from "uploadthing/server";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";

// UploadThing API limite listFiles a 500 par requete
const UPLOADTHING_LIST_LIMIT = 500;

// Limit pages per run to avoid Vercel function timeout (5 pages × 500 = 2500 files max)
const MAX_PAGES_PER_RUN = 5;

/**
 * Service de nettoyage des fichiers UploadThing orphelins
 *
 * Filet de securite pour rattraper les fichiers non references en DB:
 * - SkuMedia (url, thumbnailUrl)
 * - ReviewMedia (url)
 * - User.image (avatars)
 *
 * Execute mensuellement pour limiter l'accumulation de fichiers orphelins.
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
		// 1. Charger toutes les cles referencees en DB (approche efficace)
		const referencedKeys = await getAllReferencedFileKeys();
		console.log(
			`[CRON:cleanup-orphan-media] Found ${referencedKeys.size} referenced keys in DB`
		);

		// 2. Lister les fichiers UploadThing avec pagination
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

			// 4. Supprimer les fichiers orphelins de cette page
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
 * Charge toutes les cles de fichiers referencees en DB
 * Approche efficace: 3 requetes simples au lieu de N requetes avec LIKE
 *
 * TODO: When adding new UploadThing routes (e.g. testimonialMedia, contactAttachment),
 * ensure uploaded files are tracked in DB and add the corresponding query here.
 * Otherwise the orphan cleanup cron will delete those files as unreferenced.
 */
async function getAllReferencedFileKeys(): Promise<Set<string>> {
	const keys = new Set<string>();

	// 1. SkuMedia (url et thumbnailUrl)
	const skuMedia = await prisma.skuMedia.findMany({
		select: { url: true, thumbnailUrl: true },
	});
	for (const media of skuMedia) {
		const urlKey = extractFileKeyFromUrl(media.url);
		if (urlKey) keys.add(urlKey);
		if (media.thumbnailUrl) {
			const thumbKey = extractFileKeyFromUrl(media.thumbnailUrl);
			if (thumbKey) keys.add(thumbKey);
		}
	}

	// 2. ReviewMedia
	const reviewMedia = await prisma.reviewMedia.findMany({
		select: { url: true },
	});
	for (const media of reviewMedia) {
		const key = extractFileKeyFromUrl(media.url);
		if (key) keys.add(key);
	}

	// 3. User avatars (seulement ceux avec image non null)
	const users = await prisma.user.findMany({
		where: { image: { not: null } },
		select: { image: true },
	});
	for (const user of users) {
		if (user.image) {
			const key = extractFileKeyFromUrl(user.image);
			if (key) keys.add(key);
		}
	}

	return keys;
}

import { prisma } from "@/shared/lib/prisma";
import { UTApi } from "uploadthing/server";
import { extractFileKeyFromUrl } from "@/modules/media/utils/extract-file-key";

// UploadThing API limite listFiles a 500 par requete
const UPLOADTHING_LIST_LIMIT = 500;

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

		// 2. Lister les fichiers UploadThing (limite API: 500)
		const response = await utapi.listFiles({ limit: UPLOADTHING_LIST_LIMIT });
		const files = response.files;
		filesScanned = files.length;

		console.log(
			`[CRON:cleanup-orphan-media] Found ${files.length} files in UploadThing`
		);

		if (files.length === 0) {
			return { filesScanned: 0, orphansDeleted: 0, errors: 0 };
		}

		// 3. Identifier les fichiers orphelins
		const orphanKeys = files
			.map((f) => f.key)
			.filter((key) => !referencedKeys.has(key));

		console.log(
			`[CRON:cleanup-orphan-media] Found ${orphanKeys.length} orphan files out of ${filesScanned} scanned`
		);

		// 4. Supprimer les fichiers orphelins
		if (orphanKeys.length > 0) {
			try {
				await utapi.deleteFiles(orphanKeys);
				orphansDeleted = orphanKeys.length;
				console.log(
					`[CRON:cleanup-orphan-media] Deleted ${orphansDeleted} orphan files`
				);
			} catch (error) {
				console.error(
					"[CRON:cleanup-orphan-media] Error deleting orphan files:",
					error instanceof Error ? error.message : String(error)
				);
				errors = orphanKeys.length;
			}
		}
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

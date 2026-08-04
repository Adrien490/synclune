import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { deleteUploadThingFilesFromUrls } from "./delete-uploadthing-files.service";

/**
 * SSOT de la suppression des médias catalogue retirés par une action admin
 * (update-product, update-sku, delete-sku).
 *
 * Deux familles de références doivent survivre à un retrait de média :
 *
 * 1. MEDIA-AUDIT-003 — les snapshots de commande (`OrderItem.productImageUrl`
 *    sont figés 10 ans (Art. L102 B LPF) et rendus dans le
 *    PDF de facture : supprimer le blob fait afficher un 404 dans l'historique
 *    client. La garde vivait uniquement dans `update-product` — `update-sku`,
 *    son jumeau, supprimait sans vérifier (audit admin catalogue 2026-08-01).
 *
 * 2. Blobs PARTAGÉS par duplication — `duplicate-product` / `duplicate-sku`
 *    recopient `url` / `thumbnailUrl` tels quels : deux lignes `SkuMedia`
 *    pointent le même fichier. Supprimer une image du doublon rendait 404
 *    l'image de l'original.
 *
 * Les trois appelants invoquent ce service APRÈS leur mutation DB : les lignes
 * `SkuMedia` restantes sont donc exactement les références tierces — aucun
 * paramètre d'exclusion n'est nécessaire.
 *
 * Les URLs préservées seront ramassées plus tard par `cleanup-orphan-media`
 * SI plus rien n'y fait référence (le cron est OrderItem-aware).
 *
 * LAYER EXCEPTION : effets de bord (lectures Prisma + UTApi) — même dérogation
 * documentée que `delete-uploadthing-files.service.ts`.
 */
async function filterDeletableCatalogMediaUrls(
	urls: string[],
): Promise<{ deletable: string[]; preserved: string[] }> {
	if (urls.length === 0) return { deletable: [], preserved: [] };

	const [referencingItems, referencingMedia] = await Promise.all([
		prisma.orderItem.findMany({
			where: {
				productImageUrl: { in: urls },
			},
			select: { productImageUrl: true },
		}),
		prisma.skuMedia.findMany({
			where: {
				OR: [{ url: { in: urls } }, { thumbnailUrl: { in: urls } }],
			},
			select: { url: true, thumbnailUrl: true },
		}),
	]);

	const referencedUrls = new Set<string>();
	for (const item of referencingItems) {
		if (item.productImageUrl) referencedUrls.add(item.productImageUrl);
	}
	for (const media of referencingMedia) {
		referencedUrls.add(media.url);
		if (media.thumbnailUrl) referencedUrls.add(media.thumbnailUrl);
	}

	return {
		deletable: urls.filter((url) => !referencedUrls.has(url)),
		preserved: urls.filter((url) => referencedUrls.has(url)),
	};
}

/**
 * Filtre puis supprime d'UploadThing les URLs qu'aucun snapshot de commande ni
 * aucune ligne `SkuMedia` ne référence encore. Ne throw jamais : en cas
 * d'erreur on NE supprime PAS (préservation de l'historique) — les vrais
 * orphelins seront ramassés par `cleanup-orphan-media`.
 */
export async function deleteUnreferencedCatalogMedia(
	urls: string[],
	context: { action: string },
): Promise<void> {
	if (urls.length === 0) return;

	try {
		const { deletable, preserved } = await filterDeletableCatalogMediaUrls(urls);

		if (preserved.length > 0) {
			logger.info("Preserved still-referenced media from deletion", {
				action: context.action,
				preserved: preserved.length,
				deleted: deletable.length,
			});
		}

		if (deletable.length > 0) {
			await deleteUploadThingFilesFromUrls(deletable);
		}
	} catch (e) {
		logger.error("Failed to delete UploadThing files", e, { action: context.action });
	}
}

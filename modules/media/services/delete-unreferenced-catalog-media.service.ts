import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { deleteUploadThingFilesFromUrls } from "./delete-uploadthing-files.service";

/**
 * SSOT de la suppression des médias catalogue retirés par une action admin
 * (update-product, delete-product).
 *
 * Schéma lean : `OrderItem` ne snapshotte plus d'URL d'image — la seule famille
 * de références à préserver est le blob PARTAGÉ par duplication
 * (`duplicate-product` recopie `url` tel quel : deux lignes `ProductMedia`
 * pointent le même fichier ; supprimer une image du doublon rendait 404
 * l'image de l'original).
 *
 * Les appelants invoquent ce service APRÈS leur mutation DB : les lignes
 * `ProductMedia` restantes sont donc exactement les références tierces — aucun
 * paramètre d'exclusion n'est nécessaire.
 *
 * ⚠️ Fenêtre TOCTOU assumée : entre le `findMany` et le `deleteFiles`, un
 * `duplicate-product` concurrent pourrait ré-insérer une des URLs. Une seule
 * admin, actions séquentielles — la fermer (re-check pré-delete ou advisory
 * lock) coûterait plus que le risque qu'elle couvre.
 *
 * LAYER EXCEPTION : effets de bord (lectures Prisma + UTApi) — même dérogation
 * documentée que `delete-uploadthing-files.service.ts`.
 */
async function filterDeletableCatalogMediaUrls(
	urls: string[],
): Promise<{ deletable: string[]; preserved: string[] }> {
	if (urls.length === 0) return { deletable: [], preserved: [] };

	const referencingMedia = await prisma.productMedia.findMany({
		where: { url: { in: urls } },
		select: { url: true },
	});

	const referencedUrls = new Set<string>(referencingMedia.map((m) => m.url));

	return {
		deletable: urls.filter((url) => !referencedUrls.has(url)),
		preserved: urls.filter((url) => referencedUrls.has(url)),
	};
}

/**
 * Filtre puis supprime d'UploadThing les URLs qu'aucune ligne `ProductMedia` ne
 * référence encore. Ne throw jamais : en cas d'erreur on NE supprime PAS — un
 * blob orphelin est un coût de stockage, pas une 404.
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

"use server";

import { requireAdmin } from "@/shared/lib/actions/auth";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { z } from "zod";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { UTApi } from "uploadthing/server";

const updateThumbnailSchema = z.object({
	mediaId: z.string().cuid(),
	thumbnailUrl: z.string().url(),
	thumbnailSmallUrl: z.string().url(),
	/** Base64 blur placeholder (10x10) pour chargement progressif */
	blurDataUrl: z.string().startsWith("data:image/").optional(),
});

/**
 * Server Action pour mettre à jour les thumbnails d'un média vidéo
 * Utilisé lors de la régénération manuelle des miniatures
 */
export async function updateSkuMediaThumbnail(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// 1. Vérification admin
	const adminCheck = await requireAdmin();
	if ("error" in adminCheck) return adminCheck.error;

	// 2. Extraction et validation des données
	const rawData = {
		mediaId: formData.get("mediaId") as string,
		thumbnailUrl: formData.get("thumbnailUrl") as string,
		thumbnailSmallUrl: formData.get("thumbnailSmallUrl") as string,
		blurDataUrl: (formData.get("blurDataUrl") as string) || undefined,
	};

	const result = updateThumbnailSchema.safeParse(rawData);
	if (!result.success) {
		return {
			status: ActionStatus.VALIDATION_ERROR,
			message: result.error.issues[0].message,
		};
	}

	try {
		// P11 - 3. Récupérer les anciennes URLs avant update (pour cleanup)
		const existingMedia = await prisma.skuMedia.findUnique({
			where: { id: result.data.mediaId },
			select: {
				thumbnailUrl: true,
				thumbnailSmallUrl: true,
			},
		});

		// 4. Mise à jour du média avec les nouveaux thumbnails
		const media = await prisma.skuMedia.update({
			where: { id: result.data.mediaId },
			data: {
				thumbnailUrl: result.data.thumbnailUrl,
				thumbnailSmallUrl: result.data.thumbnailSmallUrl,
				// Persister blurDataUrl si fourni (nouveau 2025)
				...(result.data.blurDataUrl && { blurDataUrl: result.data.blurDataUrl }),
			},
			include: {
				sku: {
					select: {
						productId: true,
						product: { select: { slug: true } },
					},
				},
			},
		});

		// P11 - 5. Nettoyer les anciennes miniatures sur UploadThing (en arrière-plan)
		if (existingMedia?.thumbnailUrl || existingMedia?.thumbnailSmallUrl) {
			const oldUrls = [
				existingMedia.thumbnailUrl,
				existingMedia.thumbnailSmallUrl,
			].filter((url): url is string => !!url && url.includes("utfs.io"));

			if (oldUrls.length > 0) {
				// Fire-and-forget cleanup (ne bloque pas la réponse)
				void (async () => {
					try {
						const utapi = new UTApi();
						// Extraire les fileKeys des URLs
						const fileKeys = oldUrls
							.map((url) => {
								// URL format: https://utfs.io/f/XXXXX
								const match = url.match(/utfs\.io\/f\/([^/?]+)/);
								return match?.[1];
							})
							.filter((key): key is string => !!key);

						if (fileKeys.length > 0) {
							await utapi.deleteFiles(fileKeys);
							console.log("[updateSkuMediaThumbnail] Anciennes miniatures supprimées:", fileKeys);
						}
					} catch (cleanupError) {
						// Log mais ne pas échouer l'action
						console.warn("[updateSkuMediaThumbnail] Échec cleanup miniatures:", cleanupError);
					}
				})();
			}
		}

		// 6. Invalider le cache du produit et des listes
		updateTag(`product-${media.sku.product.slug}`);
		updateTag(`product-${media.sku.productId}-skus`);
		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: "Miniature mise à jour avec succès",
		};
	} catch (error) {
		// P11 - Log structuré pour debugging (URLs potentiellement orphelines)
		console.error("[updateSkuMediaThumbnail] Erreur mise à jour:", {
			mediaId: result.data.mediaId,
			newThumbnailUrl: result.data.thumbnailUrl,
			newThumbnailSmallUrl: result.data.thumbnailSmallUrl,
			error: error instanceof Error ? error.message : "Erreur inconnue",
		});

		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la mise à jour de la miniature",
		};
	}
}

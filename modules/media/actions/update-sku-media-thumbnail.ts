"use server";

import { requireAdmin } from "@/shared/lib/actions/auth";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { z } from "zod";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";

const updateThumbnailSchema = z.object({
	mediaId: z.string().cuid(),
	thumbnailUrl: z.string().url(),
	thumbnailSmallUrl: z.string().url(),
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
	};

	const result = updateThumbnailSchema.safeParse(rawData);
	if (!result.success) {
		return {
			status: ActionStatus.VALIDATION_ERROR,
			message: result.error.issues[0].message,
		};
	}

	try {
		// 3. Mise à jour du média avec les nouveaux thumbnails
		const media = await prisma.skuMedia.update({
			where: { id: result.data.mediaId },
			data: {
				thumbnailUrl: result.data.thumbnailUrl,
				thumbnailSmallUrl: result.data.thumbnailSmallUrl,
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

		// 4. Invalider le cache du produit et des listes
		updateTag(`product-${media.sku.product.slug}`);
		updateTag(`product-${media.sku.productId}-skus`);
		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: "Miniature mise à jour avec succès",
		};
	} catch {
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la mise à jour de la miniature",
		};
	}
}

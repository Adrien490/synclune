"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_REORDER_MEDIA_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { reorderSkuMediaSchema } from "../schemas/sku-media.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Reordonne les medias d'un SKU (drag-and-drop admin) sans recreer les entrees ni
 * toucher aux fichiers UploadThing. Update atomique des positions dans une transaction.
 */
export async function reorderSkuMedia(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_REORDER_MEDIA_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawMediaIds = safeFormGet(formData, "mediaIds");
		let parsedMediaIds: unknown;
		try {
			parsedMediaIds = rawMediaIds ? JSON.parse(rawMediaIds) : [];
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "mediaIds: JSON invalide",
			};
		}

		const validation = validateInput(reorderSkuMediaSchema, {
			skuId: safeFormGet(formData, "skuId"),
			mediaIds: parsedMediaIds,
		});
		if ("error" in validation) return validation.error;
		const { skuId, mediaIds } = validation.data;

		const skuInfo = await prisma.$transaction(async (tx) => {
			const sku = await tx.productSku.findUnique({
				// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
				// supprimé (seul writer : `delete-product`), sans chemin de restauration. Aucune
				// surface admin ne l'expose : le muter est toujours une anomalie. Sans ce filtre,
				// on pouvait ajuster le stock ou poser `isDefault` sur la variante d'un produit
				// archivé — et l'index unique partiel de `isDefault` (WHERE deletedAt IS NULL) ne
				// s'y oppose pas.
				where: { id: skuId, deletedAt: null },
				select: {
					id: true,
					sku: true,
					productId: true,
					product: { select: { slug: true } },
					images: { select: { id: true, mediaType: true } },
				},
			});

			if (!sku) {
				throw new BusinessError("La variante de produit n'existe pas.");
			}

			const existingIds = new Set(sku.images.map((m) => m.id));
			if (mediaIds.length !== existingIds.size) {
				throw new BusinessError(
					"La liste fournie doit contenir exactement tous les médias de la variante.",
				);
			}
			for (const id of mediaIds) {
				if (!existingIds.has(id)) {
					throw new BusinessError("Un média fourni n'appartient pas à cette variante.");
				}
			}

			// Le premier média EST le média principal : c'est l'invariant qu'appliquent
			// `normalizeMediaForPersistence` (création/édition) et le refine
			// « le premier média doit être une image ». Un réordonnancement qui ne
			// réécrivait que `position` désynchronisait donc les deux notions —
			// `images.orderBy position` (listes admin) et `images.where isPrimary`
			// (get-sku) pouvaient désigner deux médias différents.
			const firstMediaId = mediaIds[0]!;
			const firstMedia = sku.images.find((m) => m.id === firstMediaId);
			if (firstMedia?.mediaType === "VIDEO") {
				// SSOT de la formulation : `PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE`. Cette règle
				// existait en trois libellés divergents, un refus identique se lisant
				// différemment selon la surface — ne pas en réintroduire un quatrième.
				throw new BusinessError(PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE);
			}

			// Sequential await: Prisma interactive transactions run queries on a single
			// connection. Promise.all does not parallelize and may introduce non-determinism.
			//
			// `isPrimary` remis à false AVANT de poser le nouveau : l'index unique partiel
			// `SkuMedia_one_primary_per_sku` rejetterait deux primaires simultanés.
			await tx.skuMedia.updateMany({
				where: { skuId, isPrimary: true },
				data: { isPrimary: false },
			});
			for (let i = 0; i < mediaIds.length; i++) {
				await tx.skuMedia.update({
					where: { id: mediaIds[i]! },
					data: { position: i, isPrimary: i === 0 },
				});
			}

			return sku;
		});

		const tags = getSkuInvalidationTags(
			skuInfo.sku,
			skuInfo.productId,
			skuInfo.product.slug,
			skuInfo.id,
		);
		tags.forEach((tag) => updateTag(tag));

		return success("Ordre des medias mis a jour.", {
			skuId: skuInfo.id,
			mediaCount: mediaIds.length,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de réordonner les médias de la variante");
	}
}
import { PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE } from "@/modules/media/constants/media-limits.constants";

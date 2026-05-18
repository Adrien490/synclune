"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { setPrimarySkuMediaSchema } from "../schemas/sku-media.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Definit un media comme image principale d'un SKU (isPrimary=true)
 * Garantit l'unicite: tous les autres medias passent a isPrimary=false dans la meme transaction.
 * Seuls les medias de type IMAGE peuvent etre principaux (regle metier storefront).
 */
export async function setPrimarySkuMedia(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(setPrimarySkuMediaSchema, {
			skuId: safeFormGet(formData, "skuId"),
			mediaId: safeFormGet(formData, "mediaId"),
		});
		if ("error" in validation) return validation.error;
		const { skuId, mediaId } = validation.data;

		const skuInfo = await prisma.$transaction(async (tx) => {
			const media = await tx.skuMedia.findUnique({
				where: { id: mediaId },
				select: {
					id: true,
					skuId: true,
					mediaType: true,
					isPrimary: true,
					sku: {
						select: {
							id: true,
							sku: true,
							productId: true,
							product: { select: { slug: true } },
						},
					},
				},
			});

			if (!media) {
				throw new BusinessError("Le media n'existe pas.");
			}
			if (media.skuId !== skuId) {
				throw new BusinessError("Le média n'appartient pas à cette variante.");
			}
			if (media.mediaType !== "IMAGE") {
				throw new BusinessError(
					"Seule une image peut etre definie comme media principal (pas une video).",
				);
			}

			if (!media.isPrimary) {
				await tx.skuMedia.updateMany({
					where: { skuId, isPrimary: true },
					data: { isPrimary: false },
				});
				await tx.skuMedia.update({
					where: { id: mediaId },
					data: { isPrimary: true },
				});
			}

			return media.sku;
		});

		const tags = getSkuInvalidationTags(
			skuInfo.sku,
			skuInfo.productId,
			skuInfo.product.slug,
			skuInfo.id,
		);
		tags.forEach((tag) => updateTag(tag));

		return success("Media principal mis a jour.", {
			skuId: skuInfo.id,
			mediaId,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de definir le media principal");
	}
}

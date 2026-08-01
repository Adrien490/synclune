"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { updateSkuMediaAltTextSchema } from "../schemas/sku-media.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Met a jour le texte alternatif (WCAG) d'un media SKU sans toucher au reste du SKU
 * ni aux fichiers UploadThing.
 */
export async function updateSkuMediaAltText(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(updateSkuMediaAltTextSchema, {
			mediaId: safeFormGet(formData, "mediaId"),
			altText: safeFormGet(formData, "altText") ?? "",
		});
		if ("error" in validation) return validation.error;
		const { mediaId, altText } = validation.data;

		const skuInfo = await prisma.$transaction(async (tx) => {
			// `sku: { deletedAt: null }` — le média d'un SKU soft-deleted (produit
			// supprimé) ne doit plus être mutable : anomalie, même garde que les
			// autres mutateurs SKU.
			const media = await tx.skuMedia.findUnique({
				where: { id: mediaId, sku: { deletedAt: null } },
				select: {
					id: true,
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

			await tx.skuMedia.update({
				where: { id: mediaId },
				data: { altText },
			});

			return media.sku;
		});

		const tags = getSkuInvalidationTags(
			skuInfo.sku,
			skuInfo.productId,
			skuInfo.product.slug,
			skuInfo.id,
		);
		tags.forEach((tag) => updateTag(tag));

		return success("Texte alternatif mis a jour.");
	} catch (e) {
		return handleActionError(e, "Impossible de mettre a jour le texte alternatif");
	}
}

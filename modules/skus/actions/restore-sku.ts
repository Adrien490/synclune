"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_RESTORE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { restoreSkuSchema } from "../schemas/sku-media.schemas";
import { assertUniqueVariantCombination } from "../services/persist-sku-helpers.service";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Restaure un SKU soft-deleted (deletedAt != null -> null).
 *
 * Pre-conditions:
 * - Le SKU existe et est soft-deleted
 * - Son produit parent n'est pas lui-meme soft-deleted
 * - La combinaison (productId, ensemble exact de colorIds, size) n'est pas
 *   déjà prise par un SKU actif (validation applicative depuis migration M2M
 *   couleurs 2026-05-15 : la « variant identity » n'est plus enforced par un
 *   index unique partial DB).
 */
export async function restoreSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_RESTORE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(restoreSkuSchema, {
			skuId: safeFormGet(formData, "skuId"),
		});
		if ("error" in validation) return validation.error;
		const { skuId } = validation.data;

		const restored = await prisma.$transaction(async (tx) => {
			const existing = await tx.productSku.findUnique({
				where: { id: skuId },
				select: {
					id: true,
					sku: true,
					productId: true,
					size: true,
					deletedAt: true,
					colors: { select: { colorId: true } },
					product: { select: { slug: true, deletedAt: true } },
				},
			});

			if (!existing) {
				throw new BusinessError("La variante n'existe pas.");
			}
			if (!existing.deletedAt) {
				throw new BusinessError("Cette variante n'est pas supprimee.");
			}
			if (existing.product.deletedAt) {
				throw new BusinessError(
					"Le produit parent est supprime. Restaurez-le d'abord avant ses variantes.",
				);
			}

			// Validation applicative de l'unicité (productId, set colorIds, size),
			// sérialisée par l'advisory lock produit du helper partagé.
			await assertUniqueVariantCombination(tx, {
				productId: existing.productId,
				colorIds: existing.colors.map((c) => c.colorId),
				size: existing.size,
				excludeSkuId: skuId,
			});

			return tx.productSku.update({
				where: { id: skuId },
				data: { deletedAt: null },
				select: {
					id: true,
					sku: true,
					productId: true,
					product: { select: { slug: true } },
				},
			});
		});

		const tags = getSkuInvalidationTags(
			restored.sku,
			restored.productId,
			restored.product.slug,
			restored.id,
		);
		tags.forEach((tag) => updateTag(tag));

		return success(`Variante ${restored.sku} restauree avec succes.`, {
			skuId: restored.id,
			sku: restored.sku,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de restaurer la variante");
	}
}

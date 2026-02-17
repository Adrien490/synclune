"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { deleteProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Set a SKU as the default SKU for its product
 *
 * BUSINESS RULE: Only one SKU can be default per product
 *
 * This function guarantees isDefault uniqueness at application level via:
 * 1. Atomic transaction to prevent race conditions
 * 2. Deactivate all isDefault for the product
 * 3. Activate the selected SKU
 */
export async function setDefaultSku(
	_prev: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate SKU ID with Zod (CUID2)
		const validation = validateInput(deleteProductSkuSchema, {
			skuId: formData.get("skuId") as string,
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 4. Verify SKU exists and get productId
		const skuData = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				sku: true,
				productId: true,
				isActive: true,
				product: {
					select: {
						title: true,
						slug: true,
					},
				},
			},
		});

		if (!skuData) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Variante non trouvée",
			};
		}

		if (!skuData.isActive) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de définir une variante inactive par défaut",
			};
		}

		// 5. Atomic transaction to guarantee uniqueness
		await prisma.$transaction([
			// Deactivate all isDefault for the product
			prisma.productSku.updateMany({
				where: { productId: skuData.productId },
				data: { isDefault: false },
			}),
			// Activate the selected SKU
			prisma.productSku.update({
				where: { id: skuId },
				data: { isDefault: true },
			}),
		]);

		// 6. Invalidate cache
		const tags = getSkuInvalidationTags(
			skuData.sku,
			skuData.productId,
			skuData.product.slug,
			skuId
		);
		tags.forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Variante par défaut mise à jour avec succès",
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour de la variante par défaut");
	}
}

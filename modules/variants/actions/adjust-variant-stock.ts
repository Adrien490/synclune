"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { STOCK_LIMITS } from "@/shared/constants/validation-limits";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { adjustVariantStockSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour ajuster le stock d'une variante (delta relatif,
 * garde de plancher et de plafond ATOMIQUES via updateMany conditionnel).
 */
export async function adjustVariantStock(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const validation = validateInput(adjustVariantStockSchema, {
			variantId: safeFormGet(formData, "variantId"),
			adjustment: safeFormGet(formData, "adjustment"),
		});
		if ("error" in validation) return validation.error;

		const { variantId, adjustment } = validation.data;

		// 3. Variante + contexte d'invalidation
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				id: true,
				stock: true,
				colorId: true,
				materialId: true,
				product: { select: { id: true, slug: true } },
			},
		});
		if (!variant) return notFound("Variante", "f");

		// 4. Écriture conditionnelle atomique : jamais de read-then-write sur le
		// stock (les bijoux sont souvent stock=1).
		const result = await prisma.productVariant.updateMany({
			where: {
				id: variantId,
				stock: {
					gte: adjustment < 0 ? -adjustment : 0,
					lte: STOCK_LIMITS.MAX_INVENTORY - Math.max(adjustment, 0),
				},
			},
			data: { stock: { increment: adjustment } },
		});
		if (result.count === 0) {
			return error(
				adjustment < 0
					? "Stock insuffisant pour cet ajustement (le stock a peut-être changé)."
					: `Le stock ne peut pas dépasser ${STOCK_LIMITS.MAX_INVENTORY} unités.`,
			);
		}

		// 5. Invalidation
		getVariantInvalidationTags({
			variantId: variantId,
			productId: variant.product.id,
			productSlug: variant.product.slug,
		}).forEach((tag) => updateTag(tag));

		// 6. Succès
		const newStock = variant.stock + adjustment;
		return success(
			adjustment > 0
				? `Stock augmenté de ${adjustment} (nouveau stock : ${newStock})`
				: `Stock réduit de ${-adjustment} (nouveau stock : ${newStock})`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

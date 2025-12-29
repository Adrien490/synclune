"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_PRICE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { updateSkuPriceSchema } from "../schemas/sku.schemas";

/**
 * Server Action ADMIN pour modifier rapidement le prix d'un SKU
 *
 * @param priceInclTax - Prix en centimes (ex: 3000 = 30€)
 * @param compareAtPrice - Prix barré optionnel en centimes
 */
export async function updateSkuPrice(
	skuId: string,
	priceInclTax: number,
	compareAtPrice?: number | null
): Promise<ActionState> {
	try {
		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_UPDATE_PRICE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation
		const validation = updateSkuPriceSchema.safeParse({
			skuId,
			priceInclTax,
			compareAtPrice,
		});
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Données invalides",
			};
		}

		// 3. Vérifier que le SKU existe
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: { id: true, sku: true, priceInclTax: true, productId: true },
		});

		if (!sku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Variante non trouvée",
			};
		}

		// 4. Mettre à jour le prix
		const updateData: { priceInclTax: number; compareAtPrice?: number | null } = {
			priceInclTax,
		};

		if (compareAtPrice !== undefined) {
			updateData.compareAtPrice = compareAtPrice;
		}

		await prisma.productSku.update({
			where: { id: skuId },
			data: updateData,
		});

		// 5. Revalider les pages concernées
		revalidatePath("/admin/catalogue/inventaire");

		const formattedPrice = (priceInclTax / 100).toFixed(2);
		return {
			status: ActionStatus.SUCCESS,
			message: `Prix de ${sku.sku} mis à jour: ${formattedPrice}€`,
			data: {
				skuId: sku.id,
				previousPrice: sku.priceInclTax,
				newPrice: priceInclTax,
			},
		};
	} catch (error) {
		console.error("[UPDATE_SKU_PRICE] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de mettre à jour le prix",
		};
	}
}

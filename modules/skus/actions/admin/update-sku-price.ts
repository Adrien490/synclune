"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updatePriceSchema = z.object({
	skuId: z.string().min(1),
	priceInclTax: z.number().int().min(1, "Le prix doit être supérieur à 0"),
	compareAtPrice: z.number().int().min(0).nullable().optional(),
});

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
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation
		const validation = updatePriceSchema.safeParse({
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
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}

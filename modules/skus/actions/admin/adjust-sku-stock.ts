"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const adjustStockSchema = z.object({
	skuId: z.string().min(1),
	adjustment: z.number().int(), // Positif pour ajouter, négatif pour retirer
	reason: z.string().optional(), // Raison de l'ajustement (pour traçabilité)
});

/**
 * Server Action ADMIN pour ajuster le stock d'un SKU
 *
 * @param adjustment - Quantité à ajouter (positif) ou retirer (négatif)
 */
export async function adjustSkuStock(
	skuId: string,
	adjustment: number,
	reason?: string
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation
		const validation = adjustStockSchema.safeParse({ skuId, adjustment, reason });
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Données invalides",
			};
		}

		// 3. Vérifier que le SKU existe
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: { id: true, sku: true, inventory: true, productId: true },
		});

		if (!sku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Variante non trouvée",
			};
		}

		// 4. Vérifier que le stock ne devient pas négatif
		const newInventory = sku.inventory + adjustment;
		if (newInventory < 0) {
			return {
				status: ActionStatus.ERROR,
				message: `Stock insuffisant. Stock actuel: ${sku.inventory}, ajustement demandé: ${adjustment}`,
			};
		}

		// 5. Mettre à jour le stock avec opération atomique (évite les race conditions)
		await prisma.productSku.update({
			where: { id: skuId },
			data: {
				inventory:
					adjustment > 0
						? { increment: adjustment }
						: { decrement: Math.abs(adjustment) },
			},
		});

		// 7. Revalider les pages concernées
		revalidatePath("/admin/catalogue/inventaire");
		// La page produit sera revalidée via la relation productId si nécessaire

		const adjustmentText = adjustment > 0 ? `+${adjustment}` : `${adjustment}`;
		return {
			status: ActionStatus.SUCCESS,
			message: `Stock de ${sku.sku} ajusté (${adjustmentText}). Nouveau stock: ${newInventory}`,
			data: {
				skuId: sku.id,
				previousInventory: sku.inventory,
				newInventory,
				adjustment,
			},
		};
	} catch (error) {
		console.error("[ADJUST_SKU_STOCK] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}

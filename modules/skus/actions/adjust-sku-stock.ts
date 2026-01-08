"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_ADJUST_STOCK_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { adjustSkuStockSchema } from "../schemas/sku.schemas";
import { getInventoryInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour ajuster le stock d'un SKU
 * Compatible avec useActionState (signature FormData)
 */
export async function adjustSkuStock(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Extraire les données du FormData
		const skuId = formData.get("skuId") as string;
		const adjustmentRaw = formData.get("adjustment") as string;
		const reason = formData.get("reason") as string | null;

		const adjustment = parseInt(adjustmentRaw, 10);

		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_ADJUST_STOCK_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation
		const validation = adjustSkuStockSchema.safeParse({
			skuId,
			adjustment,
			reason: reason || undefined,
		});
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Données invalides",
			};
		}

		// 3. Vérifier que le SKU existe
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				id: true,
				sku: true,
				inventory: true,
				productId: true,
				product: { select: { slug: true } },
			},
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

		// 6. Invalider le cache avec les tags appropriés
		const tags = getInventoryInvalidationTags(sku.product.slug, sku.productId, [sku.id]);
		tags.forEach((tag) => updateTag(tag));

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
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

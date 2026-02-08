"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_ADJUST_STOCK_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
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
		const validation = validateInput(adjustSkuStockSchema, {
			skuId,
			adjustment,
			reason: reason || undefined,
		});
		if ("error" in validation) return validation.error;

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
			return error("Variante non trouvee");
		}

		// 4. Verifier que le stock ne devient pas negatif
		const newInventory = sku.inventory + adjustment;
		if (newInventory < 0) {
			return error(`Stock insuffisant. Stock actuel: ${sku.inventory}, ajustement demande: ${adjustment}`);
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
		return success(`Stock de ${sku.sku} ajuste (${adjustmentText}). Nouveau stock: ${newInventory}`, {
			skuId: sku.id,
			previousInventory: sku.inventory,
			newInventory,
			adjustment,
		});
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

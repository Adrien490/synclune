"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_ADJUST_STOCK_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { adjustSkuStockSchema } from "../schemas/sku.schemas";
import { getInventoryInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour ajuster le stock d'un SKU
 * Compatible avec useActionState (signature FormData)
 */
export async function adjustSkuStock(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// Extraire les données du FormData
		const rawSkuId = safeFormGet(formData, "skuId");
		const adjustmentRaw = safeFormGet(formData, "adjustment");
		const reason = formData.get("reason") as string | null;

		const adjustment = parseInt(adjustmentRaw ?? "", 10);

		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_ADJUST_STOCK_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validation
		const validation = validateInput(adjustSkuStockSchema, {
			skuId: rawSkuId,
			adjustment,
			reason: reason ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 4. Atomic conditional update to prevent TOCTOU race condition
		// A single UPDATE with a WHERE clause ensures stock never goes negative,
		// even under concurrent requests.
		if (adjustment < 0) {
			const result = await prisma.$executeRaw`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${adjustment}, "updatedAt" = NOW()
				WHERE "id" = ${skuId}
				AND "inventory" + ${adjustment} >= 0
			`;

			if (result === 0) {
				const sku = await prisma.productSku.findUnique({
					where: { id: skuId },
					select: { inventory: true },
				});
				if (!sku) return error("Variante non trouvee");
				return error(
					`Stock insuffisant. Stock actuel: ${sku.inventory}, ajustement demande: ${adjustment}`,
				);
			}
		} else {
			const result = await prisma.$executeRaw`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${adjustment}, "updatedAt" = NOW()
				WHERE "id" = ${skuId}
			`;

			if (result === 0) {
				return error("Variante non trouvee");
			}
		}

		// 5. Fetch updated SKU info for cache invalidation and response
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

		if (!sku) return error("Variante non trouvee");

		// 6. Invalider le cache avec les tags appropriés
		const tags = getInventoryInvalidationTags(sku.product.slug, sku.productId, [sku.id]);
		tags.forEach((tag) => updateTag(tag));

		const previousInventory = sku.inventory - adjustment;

		// 7. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.adjustStock",
			targetType: "sku",
			targetId: skuId,
			metadata: { sku: sku.sku, adjustment, previousInventory, newInventory: sku.inventory },
		});

		const adjustmentText = adjustment > 0 ? `+${adjustment}` : `${adjustment}`;
		return success(
			`Stock de ${sku.sku} ajuste (${adjustmentText}). Nouveau stock: ${sku.inventory}`,
			{
				skuId: sku.id,
				previousInventory: sku.inventory - adjustment,
				newInventory: sku.inventory,
				adjustment,
			},
		);
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

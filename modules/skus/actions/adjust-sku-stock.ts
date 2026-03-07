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
	BusinessError,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { adjustSkuStockSchema } from "../schemas/sku.schemas";
import { getInventoryInvalidationTags } from "../utils/cache.utils";
import { notifyBackInStock } from "@/modules/wishlist/services/notify-back-in-stock";

type AffectedRow = { inventory: number };

/**
 * Server Action ADMIN pour ajuster le stock d'un SKU
 * Compatible avec useActionState (signature FormData)
 */
export async function adjustSkuStock(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_ADJUST_STOCK_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les données du FormData
		const rawSkuId = safeFormGet(formData, "skuId");
		const adjustmentRaw = safeFormGet(formData, "adjustment");
		const reason = formData.get("reason") as string | null;

		const adjustment = parseInt(adjustmentRaw ?? "", 10);

		// 4. Validation
		const validation = validateInput(adjustSkuStockSchema, {
			skuId: rawSkuId,
			adjustment,
			reason: reason ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 5. Atomic conditional update using RETURNING to capture the new inventory value
		// in the same statement — eliminates the race condition between the update and
		// a subsequent read used for the error/success message.
		let newInventory: number;

		if (adjustment < 0) {
			newInventory = await prisma.$transaction(async (tx) => {
				const updated = await tx.$queryRaw<AffectedRow[]>`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${adjustment}, "updatedAt" = NOW()
					WHERE "id" = ${skuId}
					AND "inventory" + ${adjustment} >= 0
					RETURNING "inventory"
				`;

				if (updated.length === 0) {
					// Distinguish "not found" from "insufficient stock" inside the transaction
					// so the error message reflects the stock at the moment the UPDATE ran
					const existing = await tx.$queryRaw<AffectedRow[]>`
						SELECT "inventory" FROM "ProductSku" WHERE "id" = ${skuId}
					`;
					if (existing.length === 0) throw new BusinessError("Variante non trouvée");
					throw new BusinessError(
						`Stock insuffisant. Stock actuel: ${existing[0]!.inventory}, ajustement demandé: ${adjustment}`,
					);
				}

				return updated[0]!.inventory;
			});
		} else {
			const updated = await prisma.$queryRaw<AffectedRow[]>`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${adjustment}, "updatedAt" = NOW()
				WHERE "id" = ${skuId}
				RETURNING "inventory"
			`;

			if (updated.length === 0) {
				return error("Variante non trouvée");
			}

			newInventory = updated[0]!.inventory;
		}

		// 6. Fetch SKU metadata for cache invalidation and response
		// inventory is sourced from RETURNING above for accuracy
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				id: true,
				sku: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});

		if (!sku) return error("Variante non trouvée");

		// 7. Invalider le cache avec les tags appropriés
		const tags = getInventoryInvalidationTags(sku.product.slug, sku.productId, [sku.id]);
		tags.forEach((tag) => updateTag(tag));

		const previousInventory = newInventory - adjustment;

		// 8. Back-in-stock notifications (fire-and-forget)
		if (previousInventory === 0 && newInventory > 0) {
			void notifyBackInStock(sku.productId);
		}

		// 9. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.adjustStock",
			targetType: "sku",
			targetId: skuId,
			metadata: { sku: sku.sku, adjustment, previousInventory, newInventory },
		});

		const adjustmentText = adjustment > 0 ? `+${adjustment}` : `${adjustment}`;
		return success(
			`Stock de ${sku.sku} ajuste (${adjustmentText}). Nouveau stock: ${newInventory}`,
			{
				skuId: sku.id,
				previousInventory,
				newInventory,
				adjustment,
			},
		);
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

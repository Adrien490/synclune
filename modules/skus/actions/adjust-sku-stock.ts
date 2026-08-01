"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_ADJUST_STOCK_LIMIT } from "@/shared/lib/rate-limit-config";
import { STOCK_LIMITS } from "@/shared/constants/validation-limits";
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
import { recordStockMovementTx } from "../services/stock-movement.service";

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
		const admin = auth.user;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_ADJUST_STOCK_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les données du FormData
		const rawSkuId = safeFormGet(formData, "skuId");
		const adjustmentRaw = safeFormGet(formData, "adjustment");
		const reason = safeFormGet(formData, "reason");

		// 4. Validation
		const validation = validateInput(adjustSkuStockSchema, {
			skuId: rawSkuId,
			adjustment: parseInt(adjustmentRaw ?? "", 10),
			// `.optional()` accepte `undefined`, pas `null` — `safeFormGet` rend `null`.
			reason: reason ?? undefined,
		});
		if ("error" in validation) return validation.error;

		// ⚠️ `adjustment` DOIT venir de `validation.data`, pas de la variable brute
		// pré-parse : celle-ci alimentait directement le `$queryRaw` plus bas, si bien
		// qu'un futur `.transform()` / `z.coerce` sur `adjustSkuStockSchema` aurait été
		// silencieusement sans effet sur ce qui est écrit en base.
		const { skuId, adjustment, reason: validatedReason } = validation.data;

		// 5. Métadonnées SKU AVANT l'update : fail-fast « Variante non trouvée » +
		// `productId` requis pour l'enregistrement du mouvement de stock.
		const sku = await prisma.productSku.findUnique({
			// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
			// supprimé (seul writer : `delete-product`), sans chemin de restauration. Aucune
			// surface admin ne l'expose : le muter est toujours une anomalie. Sans ce filtre,
			// on pouvait ajuster le stock ou poser `isDefault` sur la variante d'un produit
			// archivé — et l'index unique partiel de `isDefault` (WHERE deletedAt IS NULL) ne
			// s'y oppose pas.
			where: { id: skuId, deletedAt: null },
			select: {
				id: true,
				sku: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});

		if (!sku) return error("Variante non trouvée");

		// 6. Update atomique + audit StockMovement dans la MÊME transaction.
		// `RETURNING` capture le nouvel inventaire dans le même statement (pas de race
		// entre l'update et un read ultérieur) ; le mouvement est écrit atomiquement.
		const newInventory = await prisma.$transaction(async (tx) => {
			let updated: AffectedRow[];

			if (adjustment < 0) {
				updated = await tx.$queryRaw<AffectedRow[]>`
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
			} else {
				// Plafond STOCK_LIMITS.MAX_INVENTORY dans le WHERE : le schéma ne borne
				// que le DELTA, pas le résultat — deux ajustements +99999 suffisaient à
				// sortir le SKU des filtres d'inventaire admin (bornés à
				// SKU_FILTERS_MAX_INVENTORY). Même garde que create/update-sku.
				updated = await tx.$queryRaw<AffectedRow[]>`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${adjustment}, "updatedAt" = NOW()
					WHERE "id" = ${skuId}
					AND "inventory" + ${adjustment} <= ${STOCK_LIMITS.MAX_INVENTORY}
					RETURNING "inventory"
				`;

				if (updated.length === 0) {
					const existing = await tx.$queryRaw<AffectedRow[]>`
						SELECT "inventory" FROM "ProductSku" WHERE "id" = ${skuId}
					`;
					if (existing.length === 0) throw new BusinessError("Variante non trouvée");
					throw new BusinessError(
						`Stock maximum dépassé (${STOCK_LIMITS.MAX_INVENTORY}). Stock actuel: ${existing[0]!.inventory}, ajustement demandé: +${adjustment}`,
					);
				}
			}

			const nextInventory = updated[0]!.inventory;

			await recordStockMovementTx(tx, {
				skuId: sku.id,
				productId: sku.productId,
				previousInventory: nextInventory - adjustment,
				newInventory: nextInventory,
				reason: validatedReason ?? null,
				createdById: admin.id,
				createdByName: admin.name ?? null,
			});

			return nextInventory;
		});

		// 7. Invalider le cache avec les tags appropriés
		const tags = getInventoryInvalidationTags(sku.product.slug, sku.productId, [sku.id]);
		tags.forEach((tag) => updateTag(tag));

		const previousInventory = newInventory - adjustment;

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

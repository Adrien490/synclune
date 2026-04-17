"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_RESTORE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { restoreSkuSchema } from "../schemas/sku-media.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Restaure un SKU soft-deleted (deletedAt != null -> null).
 *
 * Pre-conditions:
 * - Le SKU existe et est soft-deleted
 * - Son produit parent n'est pas lui-meme soft-deleted
 * - La combinaison (productId, colorId, size, materialId) n'est pas deja prise par un SKU actif
 *   (contrainte partial unique index au niveau base)
 */
export async function restoreSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_RESTORE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(restoreSkuSchema, {
			skuId: safeFormGet(formData, "skuId"),
		});
		if ("error" in validation) return validation.error;
		const { skuId } = validation.data;

		const restored = await prisma.$transaction(async (tx) => {
			const existing = await tx.productSku.findUnique({
				where: { id: skuId },
				select: {
					id: true,
					sku: true,
					productId: true,
					colorId: true,
					materialId: true,
					size: true,
					deletedAt: true,
					product: { select: { slug: true, deletedAt: true } },
				},
			});

			if (!existing) {
				throw new BusinessError("La variante n'existe pas.");
			}
			if (!existing.deletedAt) {
				throw new BusinessError("Cette variante n'est pas supprimee.");
			}
			if (existing.product.deletedAt) {
				throw new BusinessError(
					"Le produit parent est supprime. Restaurez-le d'abord avant ses variantes.",
				);
			}

			const conflict = await tx.productSku.findFirst({
				where: {
					productId: existing.productId,
					colorId: existing.colorId,
					materialId: existing.materialId,
					size: existing.size,
					deletedAt: null,
					NOT: { id: skuId },
				},
				select: { sku: true },
			});
			if (conflict) {
				throw new BusinessError(
					`Restauration impossible: une variante active utilise deja cette combinaison (Ref: ${conflict.sku}).`,
				);
			}

			return tx.productSku.update({
				where: { id: skuId },
				data: { deletedAt: null },
				select: {
					id: true,
					sku: true,
					productId: true,
					product: { select: { slug: true } },
				},
			});
		});

		const tags = getSkuInvalidationTags(
			restored.sku,
			restored.productId,
			restored.product.slug,
			restored.id,
		);
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.restore",
			targetType: "sku",
			targetId: restored.id,
			metadata: { sku: restored.sku },
		});

		return success(`Variante ${restored.sku} restauree avec succes.`, {
			skuId: restored.id,
			sku: restored.sku,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de restaurer la variante");
	}
}

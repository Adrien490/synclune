"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { BusinessError, handleActionError, safeFormGet, validateInput } from "@/shared/lib/actions";
import { bulkDeactivateSkusSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";
import {
	assertBulkPublicProductsKeepActiveSku,
	type BulkProductActiveBreakdown,
} from "../services/validate-public-active-sku.service";

export async function bulkDeactivateSkus(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			ids: safeFormGet(formData, "ids"),
		};

		const validation = validateInput(bulkDeactivateSkusSchema, rawData);
		if ("error" in validation) return validation.error;
		const { ids } = validation.data;

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante sélectionnée",
			};
		}

		if (ids.length > BULK_SKU_LIMITS.DEFAULT) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${BULK_SKU_LIMITS.DEFAULT} variantes par operation`,
			};
		}

		// Transaction atomique: lecture, validations metier, ecriture
		const skusData = await prisma.$transaction(async (tx) => {
			const found = await tx.productSku.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					sku: true,
					productId: true,
					isDefault: true,
					isActive: true,
					product: {
						select: {
							slug: true,
							status: true,
							skus: {
								where: { isActive: true, deletedAt: null },
								select: { id: true },
							},
						},
					},
				},
			});

			if (found.length !== ids.length) {
				const missing = ids.length - found.length;
				throw new BusinessError(
					`${missing} variante(s) introuvable(s) sur ${ids.length} sélectionnée(s)`,
				);
			}

			// Verifier qu'aucune variante par defaut n'est selectionnee
			const defaultSkus = found.filter((s) => s.isDefault);
			if (defaultSkus.length > 0) {
				throw new BusinessError("Impossible de désactiver une variante par défaut");
			}

			// Produit PUBLIC: garantir qu'au moins 1 SKU actif reste par produit
			const breakdown: BulkProductActiveBreakdown = new Map();
			for (const sku of found) {
				const existing = breakdown.get(sku.productId);
				if (existing) {
					if (sku.isActive) existing.activeAffected++;
				} else {
					breakdown.set(sku.productId, {
						productStatus: sku.product.status,
						activeTotal: sku.product.skus.length,
						activeAffected: sku.isActive ? 1 : 0,
					});
				}
			}
			assertBulkPublicProductsKeepActiveSku(breakdown);

			await tx.productSku.updateMany({
				where: { id: { in: ids } },
				data: { isActive: false },
			});

			return found;
		});

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		// Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.bulkDeactivate",
			targetType: "sku",
			targetId: ids.join(","),
			metadata: { count: ids.length },
		});

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) désactivée(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de désactiver les variantes");
	}
}

"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { BusinessError, handleActionError, safeFormGet, validateInput } from "@/shared/lib/actions";
import { bulkAdjustStockSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";

export async function bulkAdjustStock(
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
			mode: safeFormGet(formData, "mode"),
			value: safeFormGet(formData, "value"),
		};

		const validation = validateInput(bulkAdjustStockSchema, rawData);
		if ("error" in validation) return validation.error;
		const { ids, mode, value } = validation.data;

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante sélectionnée",
			};
		}

		if (ids.length > BULK_SKU_LIMITS.STOCK_ADJUSTMENT) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${BULK_SKU_LIMITS.STOCK_ADJUSTMENT} variantes par operation`,
			};
		}

		if (value === 0 && mode === "relative") {
			return {
				status: ActionStatus.ERROR,
				message: "La valeur d'ajustement ne peut pas être 0",
			};
		}

		// Valider que la valeur absolue est positive
		if (mode === "absolute" && value < 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le stock ne peut pas être négatif",
			};
		}

		// Appliquer les modifications avec atomic conditional update
		if (mode === "absolute") {
			await prisma.productSku.updateMany({
				where: { id: { in: ids } },
				data: { inventory: value },
			});
		} else if (value < 0) {
			// Atomic conditional update to prevent TOCTOU race condition:
			// only decrements rows where stock won't go negative.
			// Transaction auto-rollbacks on throw.
			await prisma.$transaction(async (tx) => {
				const count = await tx.$executeRaw`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${value}, "updatedAt" = NOW()
					WHERE "id" = ANY(${ids}::text[])
					AND "inventory" + ${value} >= 0
				`;

				if (count !== ids.length) {
					// Fetch current state for error message before rollback
					const insufficientSkus = await tx.productSku.findMany({
						where: { id: { in: ids }, inventory: { lt: Math.abs(value) } },
						select: { sku: true, inventory: true },
					});
					const details = insufficientSkus
						.slice(0, 3)
						.map((s) => `${s.sku} (stock: ${s.inventory})`)
						.join(", ");
					throw new BusinessError(
						`Stock insuffisant pour ${insufficientSkus.length} variante(s): ${details}${insufficientSkus.length > 3 ? "..." : ""}. Operation annulee.`,
					);
				}
			});
		} else {
			// Positive relative adjustment - no risk of negative stock
			await prisma.$executeRaw`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${value}, "updatedAt" = NOW()
				WHERE "id" = ANY(${ids}::text[])
			`;
		}

		// Recuperer les infos des SKUs pour invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});

		if (skusData.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante trouvée",
			};
		}

		if (skusData.length !== ids.length) {
			const missing = ids.length - skusData.length;
			return {
				status: ActionStatus.ERROR,
				message: `${missing} variante(s) introuvable(s) sur ${ids.length} sélectionnée(s). Le stock a été ajusté uniquement pour les variantes existantes.`,
			};
		}

		// Invalider le cache
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		// Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.bulkAdjustStock",
			targetType: "sku",
			targetId: ids.join(","),
			metadata: { count: skusData.length, mode, value },
		});

		const modeLabel = mode === "absolute" ? "défini à" : "ajusté de";
		const valueLabel = mode === "relative" && value > 0 ? `+${value}` : value.toString();

		return {
			status: ActionStatus.SUCCESS,
			message: `Stock ${modeLabel} ${valueLabel} pour ${skusData.length} variante(s)`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

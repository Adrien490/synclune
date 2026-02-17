"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { bulkAdjustStockSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";

export async function bulkAdjustStock(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			ids: formData.get("ids") as string,
			mode: formData.get("mode") as string,
			value: formData.get("value") as string,
		};

		const { ids, mode, value } = bulkAdjustStockSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
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
				message: "La valeur d'ajustement ne peut pas etre 0",
			};
		}

		// Valider que la valeur absolue est positive
		if (mode === "absolute" && value < 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le stock ne peut pas etre negatif",
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
			// Wrapped in $transaction to ensure rollback is atomic with the decrement.
			const updatedCount = await prisma.$transaction(async (tx) => {
				const count = await tx.$executeRaw`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${value}, "updatedAt" = NOW()
					WHERE "id" = ANY(${ids}::text[])
					AND "inventory" + ${value} >= 0
				`;

				if (count !== ids.length) {
					// Rollback partial updates within the same transaction
					if (count > 0) {
						await tx.$executeRaw`
							UPDATE "ProductSku"
							SET "inventory" = "inventory" - ${value}, "updatedAt" = NOW()
							WHERE "id" = ANY(${ids}::text[])
							AND "inventory" >= ${-value}
						`;
					}
					return count;
				}

				return count;
			});

			if (updatedCount !== ids.length) {
				// Fetch current state for error message
				const insufficientSkus = await prisma.productSku.findMany({
					where: { id: { in: ids }, inventory: { lt: Math.abs(value) } },
					select: { sku: true, inventory: true },
				});
				const details = insufficientSkus
					.slice(0, 3)
					.map((s) => `${s.sku} (stock: ${s.inventory})`)
					.join(", ");
				return {
					status: ActionStatus.ERROR,
					message: `Stock insuffisant pour ${insufficientSkus.length} variante(s): ${details}${insufficientSkus.length > 3 ? "..." : ""}. Operation annulee.`,
				};
			}
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
				message: "Aucune variante trouvee",
			};
		}

		console.log(
			`[SKU:stock-bulk] ${mode} ${value} applied to ${skusData.length} SKU(s): ${skusData.map((s) => s.sku).join(", ")}`
		);

		// Invalider le cache
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		const modeLabel = mode === "absolute" ? "defini a" : "ajuste de";
		const valueLabel = mode === "relative" && value > 0 ? `+${value}` : value.toString();

		return {
			status: ActionStatus.SUCCESS,
			message: `Stock ${modeLabel} ${valueLabel} pour ${skusData.length} variante(s)`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible d'ajuster le stock");
	}
}

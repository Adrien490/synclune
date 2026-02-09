"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { bulkAdjustStockSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";

const MAX_SKUS_PER_OPERATION = 50;

export async function bulkAdjustStock(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

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

		if (ids.length > MAX_SKUS_PER_OPERATION) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${MAX_SKUS_PER_OPERATION} variantes par operation`,
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
			// only decrements rows where stock won't go negative
			const updatedCount = await prisma.$executeRaw`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${value}, "updatedAt" = NOW()
				WHERE "id" = ANY(${ids}::text[])
				AND "inventory" + ${value} >= 0
			`;

			if (updatedCount !== ids.length) {
				// Rollback the partial update
				if (updatedCount > 0) {
					await prisma.$executeRaw`
						UPDATE "ProductSku"
						SET "inventory" = "inventory" + ${-value}, "updatedAt" = NOW()
						WHERE "id" = ANY(${ids}::text[])
						AND "inventory" - ${value} >= "inventory"
					`;
				}
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

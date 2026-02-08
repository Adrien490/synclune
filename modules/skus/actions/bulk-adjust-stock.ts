"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { bulkAdjustStockSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";

const MAX_SKUS_PER_OPERATION = 50;

export async function bulkAdjustStock(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
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

		// Recuperer les infos des SKUs pour validation et invalidation
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				inventory: true,
				product: { select: { slug: true } },
			},
		});

		if (skusData.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante trouvee",
			};
		}

		// Valider que les stocks ne deviennent pas negatifs en mode relatif
		if (mode === "relative" && value < 0) {
			const invalidSkus = skusData.filter((sku) => sku.inventory + value < 0);
			if (invalidSkus.length > 0) {
				return {
					status: ActionStatus.ERROR,
					message: `${invalidSkus.length} variante(s) auraient un stock negatif. Operation annulee.`,
				};
			}
		}

		// Valider que la valeur absolue est positive
		if (mode === "absolute" && value < 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le stock ne peut pas etre negatif",
			};
		}

		// Appliquer les modifications
		if (mode === "absolute") {
			await prisma.productSku.updateMany({
				where: { id: { in: ids } },
				data: { inventory: value },
			});
		} else {
			// Single UPDATE for all SKUs instead of N individual queries
			await prisma.$executeRaw`
				UPDATE "ProductSku"
				SET "inventory" = "inventory" + ${value}, "updatedAt" = NOW()
				WHERE "id" = ANY(${ids}::text[])
			`;
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

"use server";

import { requireAdmin } from "@/shared/lib/actions/auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { bulkAdjustStockSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../constants/cache";

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
		await prisma.$transaction(async (tx) => {
			if (mode === "absolute") {
				// Mode absolu: definir la meme valeur pour tous
				await tx.productSku.updateMany({
					where: { id: { in: ids } },
					data: { inventory: value },
				});
			} else {
				// Mode relatif: ajuster chaque SKU individuellement
				for (const sku of skusData) {
					await tx.productSku.update({
						where: { id: sku.id },
						data: { inventory: sku.inventory + value },
					});
				}
			}
		});

		// Invalider le cache
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		const modeLabel = mode === "absolute" ? "defini a" : "ajuste de";
		const valueLabel = mode === "relative" && value > 0 ? `+${value}` : value.toString();

		return {
			status: ActionStatus.SUCCESS,
			message: `Stock ${modeLabel} ${valueLabel} pour ${skusData.length} variante(s)`,
		};
	} catch (error) {
		// console.error("[bulkAdjustStock]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible d'ajuster le stock",
		};
	}
}

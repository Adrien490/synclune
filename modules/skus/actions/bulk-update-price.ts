"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { bulkUpdatePriceSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";

const MAX_SKUS_PER_OPERATION = 25; // Plus restrictif pour les modifications de prix

export async function bulkUpdatePrice(
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
			updateCompareAtPrice: formData.get("updateCompareAtPrice") as string,
		};

		const { ids, mode, value, updateCompareAtPrice } = bulkUpdatePriceSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
			};
		}

		if (ids.length > MAX_SKUS_PER_OPERATION) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${MAX_SKUS_PER_OPERATION} variantes par operation de prix`,
			};
		}

		if (mode === "percentage" && value === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le pourcentage ne peut pas etre 0",
			};
		}

		if (mode === "absolute" && value < 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le prix ne peut pas etre negatif",
			};
		}

		// Recuperer les infos des SKUs pour validation et invalidation
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				priceInclTax: true,
				compareAtPrice: true,
				product: { select: { slug: true } },
			},
		});

		if (skusData.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante trouvee",
			};
		}

		// Calculer les nouveaux prix et valider
		const updatesWithNewPrice = skusData.map((sku) => {
			let newPrice: number;

			if (mode === "absolute") {
				// Mode absolu: valeur en centimes
				newPrice = Math.round(value);
			} else {
				// Mode pourcentage: appliquer le pourcentage
				const multiplier = 1 + value / 100;
				newPrice = Math.round(sku.priceInclTax * multiplier);
			}

			// S'assurer que le prix est positif et au minimum 1 centime
			newPrice = Math.max(1, newPrice);

			return {
				...sku,
				newPrice,
			};
		});

		// Verifier qu'aucun prix ne depasse le maximum
		const MAX_PRICE = 99999999; // 999999.99 euros en centimes
		const invalidPrices = updatesWithNewPrice.filter((u) => u.newPrice > MAX_PRICE);
		if (invalidPrices.length > 0) {
			return {
				status: ActionStatus.ERROR,
				message: `${invalidPrices.length} variante(s) auraient un prix trop eleve. Maximum: 999999.99 EUR`,
			};
		}

		// Appliquer les modifications
		await prisma.$transaction(async (tx) => {
			for (const update of updatesWithNewPrice) {
				const data: { priceInclTax: number; compareAtPrice?: number | null } = {
					priceInclTax: update.newPrice,
				};

				// Si on met a jour le compareAtPrice, appliquer le meme ratio
				if (updateCompareAtPrice && update.compareAtPrice) {
					if (mode === "absolute") {
						// En mode absolu, mettre le meme prix
						data.compareAtPrice = update.newPrice;
					} else {
						// En mode pourcentage, appliquer le meme ratio
						const multiplier = 1 + value / 100;
						data.compareAtPrice = Math.max(1, Math.round(update.compareAtPrice * multiplier));
					}
				}

				await tx.productSku.update({
					where: { id: update.id },
					data,
				});
			}
		});

		// Invalider le cache
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		const modeLabel = mode === "absolute"
			? `defini a ${(value / 100).toFixed(2)} EUR`
			: `ajuste de ${value > 0 ? "+" : ""}${value}%`;

		return {
			status: ActionStatus.SUCCESS,
			message: `Prix ${modeLabel} pour ${skusData.length} variante(s)`,
		};
	} catch (error) {
		// console.error("[bulkUpdatePrice]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de modifier les prix",
		};
	}
}

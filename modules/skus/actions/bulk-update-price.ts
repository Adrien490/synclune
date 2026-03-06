"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, safeFormGet, validateInput } from "@/shared/lib/actions";
import { bulkUpdatePriceSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";

export async function bulkUpdatePrice(
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
			updateCompareAtPrice: safeFormGet(formData, "updateCompareAtPrice"),
		};

		const validation = validateInput(bulkUpdatePriceSchema, rawData);
		if ("error" in validation) return validation.error;
		const { ids, mode, value, updateCompareAtPrice } = validation.data;

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante sélectionnée",
			};
		}

		if (ids.length > BULK_SKU_LIMITS.PRICE_UPDATE) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${BULK_SKU_LIMITS.PRICE_UPDATE} variantes par operation de prix`,
			};
		}

		if (mode === "percentage" && value === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le pourcentage ne peut pas être 0",
			};
		}

		if (mode === "absolute" && value < 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Le prix ne peut pas être négatif",
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
				message: "Aucune variante trouvée",
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
				message: `${invalidPrices.length} variante(s) auraient un prix trop élevé. Maximum: 999999.99 EUR`,
			};
		}

		// Appliquer les modifications
		const multiplier = 1 + value / 100;
		await prisma.$transaction(
			updatesWithNewPrice.map((update) => {
				const data: { priceInclTax: number; compareAtPrice?: number | null } = {
					priceInclTax: update.newPrice,
				};

				if (updateCompareAtPrice && update.compareAtPrice) {
					data.compareAtPrice =
						mode === "absolute"
							? update.newPrice
							: Math.max(1, Math.round(update.compareAtPrice * multiplier));
				}

				return prisma.productSku.update({ where: { id: update.id }, data });
			}),
		);

		// Invalider le cache
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		// Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.bulkUpdatePrice",
			targetType: "sku",
			targetId: ids.join(","),
			metadata: { count: skusData.length, mode, value, updateCompareAtPrice },
		});

		const modeLabel =
			mode === "absolute"
				? `défini à ${(value / 100).toFixed(2)} EUR`
				: `ajusté de ${value > 0 ? "+" : ""}${value}%`;

		return {
			status: ActionStatus.SUCCESS,
			message: `Prix ${modeLabel} pour ${skusData.length} variante(s)`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de modifier les prix");
	}
}

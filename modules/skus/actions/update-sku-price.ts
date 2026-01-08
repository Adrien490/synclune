"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_PRICE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { updateSkuPriceSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour modifier rapidement le prix d'un SKU
 * Compatible avec useActionState (signature FormData)
 *
 * @param formData - FormData avec:
 *   - skuId: ID du SKU
 *   - priceInclTaxEuros: Prix en euros (ex: 30.00)
 *   - compareAtPriceEuros: Prix barré optionnel en euros
 */
export async function updateSkuPrice(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_UPDATE_PRICE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Extraire et valider les données
		const skuId = formData.get("skuId") as string;
		const priceInclTaxEuros = formData.get("priceInclTaxEuros") as string;
		const compareAtPriceEuros = formData.get("compareAtPriceEuros") as string | null;

		const validation = updateSkuPriceSchema.safeParse({
			skuId,
			priceInclTaxEuros,
			compareAtPriceEuros: compareAtPriceEuros || "",
		});

		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Données invalides",
			};
		}

		// 3. Vérifier que le SKU existe
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				id: true,
				sku: true,
				priceInclTax: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});

		if (!sku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Variante non trouvée",
			};
		}

		// 4. Convertir euros → centimes
		const priceInclTaxCents = Math.round(validation.data.priceInclTaxEuros * 100);
		const compareAtPriceCents = validation.data.compareAtPriceEuros
			? Math.round(validation.data.compareAtPriceEuros * 100)
			: null;

		// 5. Mettre à jour le prix
		await prisma.productSku.update({
			where: { id: skuId },
			data: {
				priceInclTax: priceInclTaxCents,
				compareAtPrice: compareAtPriceCents,
			},
		});

		// 6. Invalider le cache avec les tags appropriés
		const tags = getSkuInvalidationTags(sku.sku, sku.productId, sku.product.slug, sku.id);
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Prix de ${sku.sku} mis à jour: ${validation.data.priceInclTaxEuros.toFixed(2)} €`,
			data: {
				skuId: sku.id,
				previousPrice: sku.priceInclTax,
				newPrice: priceInclTaxCents,
			},
		};
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour le prix");
	}
}

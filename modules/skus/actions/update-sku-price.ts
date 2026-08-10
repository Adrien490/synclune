"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_PRICE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
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
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_UPDATE_PRICE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire et valider les données
		const rawSkuId = safeFormGet(formData, "skuId");
		const priceInclTaxEuros = safeFormGet(formData, "priceInclTaxEuros");
		const compareAtPriceEuros = safeFormGet(formData, "compareAtPriceEuros");

		const validation = validateInput(updateSkuPriceSchema, {
			skuId: rawSkuId,
			priceInclTaxEuros,
			compareAtPriceEuros: compareAtPriceEuros ?? "",
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 4. Convertir euros → centimes
		const priceInclTaxCents = Math.round(validation.data.priceInclTaxEuros * 100);
		const compareAtPriceCents = validation.data.compareAtPriceEuros
			? Math.round(validation.data.compareAtPriceEuros * 100)
			: null;

		// 5. Vérifier existence + mettre à jour le prix dans une transaction
		const sku = await prisma.$transaction(async (tx) => {
			const existing = await tx.productSku.findUnique({
				// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
				// supprimé (seul writer : `delete-product`), sans chemin de restauration. Aucune
				// surface admin ne l'expose : le muter est toujours une anomalie. Sans ce filtre,
				// on pouvait ajuster le stock ou réordonner la variante d'un produit archivé.
				where: { id: skuId, deletedAt: null },
				select: {
					id: true,
					sku: true,
					priceInclTax: true,
					productId: true,
					product: { select: { slug: true } },
				},
			});

			if (!existing) return null;

			await tx.productSku.update({
				where: { id: skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
				},
			});

			return existing;
		});

		if (!sku) {
			return error("Variante non trouvée");
		}

		// 6. Invalider le cache avec les tags appropriés
		const tags = getSkuInvalidationTags(sku.sku, sku.productId, sku.product.slug, sku.id);
		tags.forEach((tag) => updateTag(tag));

		// 7. Audit log

		return success(
			`Prix de ${sku.sku} mis a jour: ${validation.data.priceInclTaxEuros.toFixed(2)} EUR`,
			{
				skuId: sku.id,
				previousPrice: sku.priceInclTax,
				newPrice: priceInclTaxCents,
			},
		);
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour le prix");
	}
}

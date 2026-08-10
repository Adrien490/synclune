"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import {
	BusinessError,
	validateInput,
	handleActionError,
	safeFormGet,
	success,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { setDefaultProductSkuSchema } from "../schemas/sku.schemas";
import { moveSkuToFront } from "../services/persist-sku-helpers.service";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Set a SKU as the default (representative) SKU for its product
 *
 * Depuis le remplacement d'`isDefault` par `position` (audit schéma V5, lot A2),
 * « définir par défaut » = amener la variante au rang 0 et renuméroter ses sœurs
 * en préservant leur ordre relatif. Un entier de rang n'a pas d'unicité à
 * garantir : plus d'index unique partiel, plus de promotion en deux temps —
 * une transaction READ COMMITTED ordinaire suffit.
 */
export async function setDefaultSku(
	_prev: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate SKU ID with Zod (CUID2)
		const validation = validateInput(setDefaultProductSkuSchema, {
			skuId: safeFormGet(formData, "skuId"),
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 4. Verify SKU exists + atomic reorder (la cible prend le rang 0)
		const skuData = await prisma.$transaction(async (tx) => {
			const sku = await tx.productSku.findUnique({
				// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
				// supprimé (seul writer : `delete-product`), sans chemin de restauration. Aucune
				// surface admin ne l'expose : le muter est toujours une anomalie. Sans ce filtre,
				// on pouvait ajuster le stock ou réordonner la variante d'un produit archivé.
				where: { id: skuId, deletedAt: null },
				select: {
					sku: true,
					productId: true,
					isActive: true,
					product: {
						select: {
							title: true,
							slug: true,
						},
					},
				},
			});

			if (!sku) {
				throw new BusinessError("Variante non trouvée");
			}

			if (!sku.isActive) {
				throw new BusinessError("Impossible de définir une variante inactive par défaut");
			}

			await moveSkuToFront(tx, sku.productId, skuId);

			return sku;
		});

		// 5. Invalidate cache
		const tags = getSkuInvalidationTags(
			skuData.sku,
			skuData.productId,
			skuData.product.slug,
			skuId,
		);
		tags.forEach((tag) => updateTag(tag));

		// 6. Audit log

		return success("Variante par défaut mise à jour avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour de la variante par défaut");
	}
}

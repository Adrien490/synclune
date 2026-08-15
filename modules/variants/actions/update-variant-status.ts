"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	error,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { updateProductVariantStatusSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour activer/désactiver une variante — schéma lean.
 * Garde : jamais désactiver la dernière variante active d'un produit en vente.
 */
export async function updateVariantStatus(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const validation = validateInput(updateProductVariantStatusSchema, {
			variantId: safeFormGet(formData, "variantId"),
			active: safeFormGet(formData, "active"),
		});
		if ("error" in validation) return validation.error;
		const { variantId, active } = validation.data;

		// 3. Variante + fratrie
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				id: true,
				active: true,
				colorId: true,
				materialId: true,
				product: {
					select: {
						id: true,
						slug: true,
						active: true,
						variants: { select: { id: true, active: true } },
					},
				},
			},
		});
		if (!variant) return notFound("Variante", "f");

		if (variant.active === active) {
			return success(active ? "La variante est déjà active" : "La variante est déjà inactive");
		}

		// 4. Garde dernière variante active
		if (!active && variant.product.active) {
			const otherActive = variant.product.variants.some((v) => v.id !== variant.id && v.active);
			if (!otherActive) {
				return error(
					"Impossible de désactiver la dernière variante active d'un produit en vente. Masque d'abord le produit.",
				);
			}
		}

		// 5. Écriture
		await prisma.productVariant.update({
			where: { id: variantId },
			data: { active },
		});

		// 6. Invalidation
		getVariantInvalidationTags({
			variantId: variantId,
			productId: variant.product.id,
			productSlug: variant.product.slug,
			colorIds: [variant.colorId],
			materialIds: [variant.materialId],
		}).forEach((tag) => updateTag(tag));

		// 7. Succès
		return success(active ? "Variante activée" : "Variante désactivée");
	} catch (e) {
		return handleActionError(e, "Impossible de changer le statut de la variante");
	}
}

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
import { deleteProductVariantSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour supprimer une variante — schéma lean (lot 2) :
 * suppression RÉELLE. Les OrderItem gardent leurs snapshots (SetNull).
 * Garde : jamais la dernière variante d'un produit (règle « au moins une »).
 */
export async function deleteVariant(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const validation = validateInput(deleteProductVariantSchema, {
			variantId: safeFormGet(formData, "variantId"),
		});
		if ("error" in validation) return validation.error;
		const { variantId } = validation.data;

		// 3. Variante + fratrie
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				id: true,
				colorId: true,
				materialId: true,
				product: {
					select: {
						id: true,
						slug: true,
						name: true,
						_count: { select: { variants: true } },
					},
				},
			},
		});
		if (!variant) return notFound("Variante", "f");

		// 4. Garde : chaque produit garde AU MOINS une variante
		if (variant.product._count.variants <= 1) {
			return error(
				"Impossible de supprimer la dernière variante du produit. Supprime le produit entier, ou crée d'abord une autre variante.",
			);
		}

		// 5. Suppression réelle
		await prisma.productVariant.delete({ where: { id: variantId } });

		// 6. Invalidation
		getVariantInvalidationTags({
			variantId: variantId,
			productId: variant.product.id,
			productSlug: variant.product.slug,
			colorIds: [variant.colorId],
			materialIds: [variant.materialId],
		}).forEach((tag) => updateTag(tag));

		// 7. Succès
		return success(`Variante supprimée de « ${variant.product.name} »`);
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer la variante");
	}
}

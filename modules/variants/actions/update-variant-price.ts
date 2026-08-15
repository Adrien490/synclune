"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import { success, notFound, handleActionError, safeFormGet, error } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { updateVariantPriceSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";
import { formatEuro } from "@/shared/utils/format-euro";

/**
 * Server Action ADMIN pour modifier l'override de prix d'une variante —
 * schéma lean : champ vide = la variante retombe sur le prix du produit.
 */
export async function updateVariantPrice(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation (safeParse : path Zod pour cibler le champ)
		const parsed = updateVariantPriceSchema.safeParse({
			variantId: safeFormGet(formData, "variantId"),
			priceEuros: safeFormGet(formData, "priceEuros") ?? "",
		});
		if (!parsed.success) {
			return error(parsed.error.issues[0]?.message ?? "Données invalides");
		}
		const { variantId, priceEuros } = parsed.data;

		// 3. Variante
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				id: true,
				product: { select: { id: true, slug: true, priceCents: true } },
			},
		});
		if (!variant) return notFound("Variante", "f");

		// 4. Écriture
		const priceCents = priceEuros ? Math.round(priceEuros * 100) : null;
		await prisma.productVariant.update({
			where: { id: variantId },
			data: { priceCents },
		});

		// 5. Invalidation
		getVariantInvalidationTags({
			variantId: variantId,
			productId: variant.product.id,
			productSlug: variant.product.slug,
		}).forEach((tag) => updateTag(tag));

		// 6. Succès
		return success(
			priceCents === null
				? `Prix propre retiré — la variante suit le prix du produit (${formatEuro(variant.product.priceCents)})`
				: `Prix de la variante mis à jour : ${formatEuro(priceCents)}`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le prix");
	}
}

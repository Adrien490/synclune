"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import {
	success,
	notFound,
	handleActionError,
	isUniqueConstraintError,
	safeFormGet,
	error,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { createProductVariantSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour créer une variante — schéma lean (lot 2).
 * `path` Zod requis pour cibler le champ fautif → safeParse direct (convention
 * documentée : les formulaires variante mappent les erreurs par champ).
 */
export async function createVariant(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const parsed = createProductVariantSchema.safeParse({
			productId: safeFormGet(formData, "productId"),
			priceEuros: safeFormGet(formData, "priceEuros") ?? "",
			stock: safeFormGet(formData, "stock"),
			active: safeFormGet(formData, "active") ?? true,
			colorId: safeFormGet(formData, "colorId") ?? "",
			materialId: safeFormGet(formData, "materialId") ?? "",
			size: safeFormGet(formData, "size") ?? "",
		});
		if (!parsed.success) {
			return error(parsed.error.issues[0]?.message ?? "Données invalides");
		}
		const data = parsed.data;

		// 3. Produit parent
		const product = await prisma.product.findUnique({
			where: { id: data.productId },
			select: { id: true, slug: true, name: true },
		});
		if (!product) return notFound("Produit");

		// 4. Création (l'unicité (productId, size, colorId, materialId) est portée
		// par la contrainte DB → P2002 rendu en message clair)
		const variant = await prisma.productVariant.create({
			data: {
				productId: data.productId,
				priceCents: data.priceEuros ? Math.round(data.priceEuros * 100) : null,
				stock: data.stock,
				active: data.active,
				colorId: data.colorId ?? null,
				materialId: data.materialId ?? null,
				size: data.size?.trim() ?? null,
			},
			select: { id: true, colorId: true, materialId: true },
		});

		// 5. Invalidation
		getVariantInvalidationTags({
			variantId: variant.id,
			productId: product.id,
			productSlug: product.slug,
			colorIds: [variant.colorId],
			materialIds: [variant.materialId],
		}).forEach((tag) => updateTag(tag));

		// 6. Succès
		return success(`Nouvelle variante ajoutée à « ${product.name} »`, { variantId: variant.id });
	} catch (e) {
		if (isUniqueConstraintError(e)) {
			return error(
				"Une variante identique (même taille, couleur et matériau) existe déjà pour ce produit.",
			);
		}
		return handleActionError(e, "Impossible de créer la variante");
	}
}

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
	isUniqueConstraintError,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { duplicateProductVariantSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action ADMIN pour dupliquer une variante — schéma lean (lot 2).
 * La contrainte d'unicité (productId, size, colorId, materialId) rend la copie
 * IDENTIQUE impossible : la copie naît INACTIVE et sans taille pour laisser
 * l'admin la différencier (P2002 rendu en message clair sinon).
 */
export async function duplicateVariant(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const validation = validateInput(duplicateProductVariantSchema, {
			variantId: safeFormGet(formData, "variantId"),
		});
		if ("error" in validation) return validation.error;
		const { variantId } = validation.data;

		// 3. Variante source
		const source = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: {
				productId: true,
				priceCents: true,
				stock: true,
				colorId: true,
				materialId: true,
				size: true,
				product: { select: { id: true, slug: true, name: true } },
			},
		});
		if (!source) return notFound("Variante source", "f");

		// 4. Copie inactive, taille vidée (voir docblock)
		const copy = await prisma.productVariant.create({
			data: {
				productId: source.productId,
				priceCents: source.priceCents,
				stock: 0,
				active: false,
				colorId: source.colorId,
				materialId: source.materialId,
				size: null,
			},
			select: { id: true },
		});

		// 5. Invalidation
		getVariantInvalidationTags({
			variantId: copy.id,
			productId: source.product.id,
			productSlug: source.product.slug,
			colorIds: [source.colorId],
			materialIds: [source.materialId],
		}).forEach((tag) => updateTag(tag));

		// 6. Succès
		return success(
			`Variante dupliquée sur « ${source.product.name} » (inactive, stock 0 — complète-la avant activation)`,
			{ variantId: copy.id },
		);
	} catch (e) {
		if (isUniqueConstraintError(e)) {
			return error(
				"Une variante identique existe déjà (une copie sans taille existe peut-être) — modifie-la plutôt.",
			);
		}
		return handleActionError(e, "Impossible de dupliquer la variante");
	}
}

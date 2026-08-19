"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { deleteProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour supprimer un ProductType
 * Protection: un type encore rattaché à des produits ne peut pas être supprimé
 * (FK Restrict — la pré-vérification produit un message lisible).
 */
export async function deleteProductType(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 3. Extraction et validation
		const rawData = {
			productTypeId: safeFormGet(formData, "productTypeId"),
		};

		const validated = validateInput(deleteProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId } = validated.data;

		// 4. Verifier et supprimer dans une transaction pour eviter les race conditions
		const result = await prisma.$transaction(async (tx) => {
			const pt = await tx.productType.findUnique({
				where: { id: productTypeId },
				select: {
					id: true,
					label: true,
					slug: true,
					_count: {
						select: {
							products: true,
						},
					},
				},
			});

			if (!pt) return { status: "notFound" as const };

			if (pt._count.products > 0) {
				return {
					status: "blocked" as const,
					message: `Le type "${pt.label}" a ${pt._count.products} produit(s) et ne peut pas être supprimé`,
				};
			}

			await tx.productType.delete({ where: { id: productTypeId } });
			return { status: "deleted" as const, label: pt.label, slug: pt.slug };
		});

		if (result.status === "notFound") {
			return notFound("Type de bijou");
		}

		if (result.status === "blocked") {
			return error(result.message);
		}

		// 5. Invalidation du cache (incluant tags détail granulaire + counts)
		getProductTypeInvalidationTags(result.slug, productTypeId).forEach((tag) => updateTag(tag));

		return success("Type de bijou supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}

"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
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
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { deleteProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour supprimer un ProductType
 * Protection: Les types systeme (isSystem: true) et ceux avec produits actifs ne peuvent pas etre supprimes
 */
export async function deleteProductType(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

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
					isSystem: true,
					label: true,
					slug: true,
					_count: {
						select: {
							products: {
								where: {
									status: "PUBLIC",
									// deletedAt: null — les 5 autres _count du module l'ont, celui-ci
									// ne l'avait pas. Un produit soft-deleted est ARCHIVED aujourd'hui,
									// donc le compte est juste ; mais qu'un `status: PUBLIC` soit un jour
									// reecrit sur un produit supprime rendrait ce type INDELEBILE a
									// jamais, avec un message citant des produits invisibles. Meme
									// famille que le pre-compte de delete-color / delete-material.
									deletedAt: null,
									skus: { some: { isActive: true, deletedAt: null } },
								},
							},
						},
					},
				},
			});

			if (!pt) return { status: "notFound" as const };

			if (pt.isSystem) {
				return {
					status: "blocked" as const,
					message: `Le type "${pt.label}" est un type systeme et ne peut pas etre supprime`,
				};
			}

			if (pt._count.products > 0) {
				return {
					status: "blocked" as const,
					message: `Le type "${pt.label}" a ${pt._count.products} produit(s) actif(s) et ne peut pas être supprimé`,
				};
			}

			await tx.productType.delete({ where: { id: productTypeId } });
			return { status: "deleted" as const, label: pt.label, slug: pt.slug };
		});

		if (result.status === "notFound") {
			return notFound("Type de produit");
		}

		if (result.status === "blocked") {
			return error(result.message);
		}

		// 5. Invalidation du cache (incluant tags détail granulaire + counts)
		getProductTypeInvalidationTags(result.slug, productTypeId).forEach((tag) => updateTag(tag));

		return success("Type de produit supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}

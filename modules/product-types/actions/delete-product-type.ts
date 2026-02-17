"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
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
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction et validation
		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
		};

		const validated = validateInput(deleteProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId } = validated.data;

		// 4. Verifier que le type existe, n'est pas systeme, et n'a pas de produits actifs
		const productType = await prisma.productType.findUnique({
			where: { id: productTypeId },
			select: {
				id: true,
				isSystem: true,
				label: true,
				_count: {
					select: {
						products: {
							where: {
								status: "PUBLIC",
								skus: { some: { isActive: true } },
							},
						},
					},
				},
			},
		});

		if (!productType) {
			return notFound("Type de produit");
		}

		// 5. Protection: Bloquer la suppression des types systeme
		if (productType.isSystem) {
			return error(`Le type "${productType.label}" est un type systeme et ne peut pas etre supprime`);
		}

		// 6. Protection: Bloquer la suppression des types avec produits actifs
		if (productType._count.products > 0) {
			return error(`Le type "${productType.label}" a ${productType._count.products} produit(s) actif(s) et ne peut pas etre supprime`);
		}

		// 7. Suppression
		await prisma.productType.delete({
			where: { id: productTypeId },
		});

		// 6. Invalidation du cache
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}

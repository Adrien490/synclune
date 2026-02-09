"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { deleteProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour supprimer un ProductType
 * Protection: Les types systeme (isSystem: true) ne peuvent pas etre supprimes
 */
export async function deleteProductType(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction et validation
		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
		};

		const validated = validateInput(deleteProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId } = validated.data;

		// 3. Verifier si c'est un type systeme
		const productType = await prisma.productType.findUnique({
			where: { id: productTypeId },
			select: {
				id: true,
				isSystem: true,
				label: true,
			},
		});

		if (!productType) {
			return notFound("Type de produit");
		}

		// 4. Protection: Bloquer la suppression des types systeme
		if (productType.isSystem) {
			return error(`Le type "${productType.label}" est un type systeme et ne peut pas etre supprime`);
		}

		// 5. Suppression (les produits liés auront leur typeId mis à null automatiquement)
		await prisma.productType.delete({
			where: { id: productTypeId },
		});

		// 6. Invalidation du cache
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success("Type de produit supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}

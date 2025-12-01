"use server";

import { isAdmin } from "@/modules/auth/utils/guards";

import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

		// 2. Extraction et validation
		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
		};

		const result = deleteProductTypeSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Donnees invalides",
			};
		}

		const { productTypeId } = result.data;

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
			return {
				status: ActionStatus.ERROR,
				message: "Type de produit non trouve",
			};
		}

		// 4. Protection: Bloquer la suppression des types systeme
		if (productType.isSystem) {
			return {
				status: ActionStatus.ERROR,
				message: `Le type "${productType.label}" est un type systeme et ne peut pas etre supprime`,
			};
		}

		// 5. Suppression (les produits liés auront leur typeId mis à null automatiquement)
		await prisma.productType.delete({
			where: { id: productTypeId },
		});

		// 6. Revalidation et invalidation du cache
		revalidatePath("/admin/catalogue/types-de-produits");
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: "Type de produit supprimé avec succès",
		};
	} catch (error) {
// console.error("[DELETE_PRODUCT_TYPE]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la suppression",
		};
	}
}

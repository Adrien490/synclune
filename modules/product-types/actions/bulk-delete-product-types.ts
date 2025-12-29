"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { bulkDeleteProductTypesSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour supprimer plusieurs ProductTypes en masse
 * Protection: Les types systeme (isSystem: true) et ceux avec produits actifs ne peuvent pas etre supprimes
 */
export async function bulkDeleteProductTypes(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction et validation
		const rawData = {
			ids: formData.get("ids") as string,
		};

		const result = bulkDeleteProductTypesSchema.safeParse(rawData);
		if (!result.success || result.data.ids.length === 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Au moins un type de bijou doit être sélectionné",
			};
		}

		const { ids } = result.data;

		// 3. Récupérer les types pour vérification
		const productTypes = await prisma.productType.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				label: true,
				isSystem: true,
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

		// 4. Séparer les types supprimables des non-supprimables
		const systemTypes = productTypes.filter((pt) => pt.isSystem);
		const typesWithProducts = productTypes.filter(
			(pt) => !pt.isSystem && pt._count.products > 0
		);
		const deletableTypes = productTypes.filter(
			(pt) => !pt.isSystem && pt._count.products === 0
		);

		if (deletableTypes.length === 0) {
			const errors: string[] = [];
			if (systemTypes.length > 0) {
				errors.push(
					`${systemTypes.length} type(s) système non supprimable(s): ${systemTypes.map((t) => t.label).join(", ")}`
				);
			}
			if (typesWithProducts.length > 0) {
				errors.push(
					`${typesWithProducts.length} type(s) avec produits actifs: ${typesWithProducts.map((t) => t.label).join(", ")}`
				);
			}
			return {
				status: ActionStatus.ERROR,
				message: `Aucun type supprimable. ${errors.join(". ")}`,
			};
		}

		// 5. Supprimer les types éligibles
		await prisma.productType.deleteMany({
			where: { id: { in: deletableTypes.map((pt) => pt.id) } },
		});

		// 6. Revalidation et invalidation du cache
		revalidatePath("/admin/catalogue/types-de-produits");
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		// 7. Construire le message de retour
		const skipped = systemTypes.length + typesWithProducts.length;
		let message = `${deletableTypes.length} type(s) de bijou supprimé(s)`;
		if (skipped > 0) {
			const skippedReasons: string[] = [];
			if (systemTypes.length > 0) {
				skippedReasons.push(`${systemTypes.length} système`);
			}
			if (typesWithProducts.length > 0) {
				skippedReasons.push(`${typesWithProducts.length} avec produits`);
			}
			message += ` - ${skipped} ignoré(s) (${skippedReasons.join(", ")})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_DELETE_PRODUCT_TYPES]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la suppression",
		};
	}
}

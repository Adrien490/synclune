"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

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

		const validated = validateInput(bulkDeleteProductTypesSchema, rawData);
		if ("error" in validated) return validated.error;

		const { ids } = validated.data;

		if (ids.length === 0) {
			return error("Au moins un type de bijou doit être sélectionné");
		}

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
			return error(`Aucun type supprimable. ${errors.join(". ")}`);
		}

		// 5. Supprimer les types éligibles
		await prisma.productType.deleteMany({
			where: { id: { in: deletableTypes.map((pt) => pt.id) } },
		});

		// 6. Invalidation du cache
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);
		updateTag("navbar-menu");

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

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}

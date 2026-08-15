"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	validationError,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { toggleProductStatusSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getVariantInvalidationTags } from "@/modules/variants/utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";

/**
 * Server Action pour basculer la visibilité d'un produit — schéma lean (lot 2) :
 * l'ancien triptyque DRAFT/PUBLIC/ARCHIVED devient un booléen `active`.
 * L'activation revalide la publiabilité (variante active avec stock + image).
 */
export async function toggleProductStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const rawData = {
			productId: safeFormGet(formData, "productId"),
			targetActive: safeFormGet(formData, "targetActive") ?? undefined,
		};
		const validation = validateInput(toggleProductStatusSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId, targetActive } = validation.data;

		// 3. Produit + données de validation en une requête
		const existingProduct = await prisma.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				name: true,
				slug: true,
				active: true,
				collections: { select: { slug: true } },
				variants: {
					select: {
						id: true,
						active: true,
						stock: true,
						colorId: true,
						materialId: true,
					},
				},
				media: { select: { type: true } },
			},
		});

		if (!existingProduct) {
			return notFound("Produit");
		}

		const nextActive = targetActive ?? !existingProduct.active;

		if (nextActive === existingProduct.active) {
			return success(
				nextActive
					? `« ${existingProduct.name} » est déjà en vente`
					: `« ${existingProduct.name} » est déjà masqué`,
			);
		}

		// 4. Publication : revalider les règles métier
		if (nextActive) {
			const pubCheck = validateProductForPublication(existingProduct);
			if (!pubCheck.isValid) {
				return validationError(pubCheck.errorMessage!);
			}
		}

		// 5. Écriture
		const updatedProduct = await prisma.product.update({
			where: { id: productId },
			data: { active: nextActive },
			select: { id: true, name: true, slug: true, active: true },
		});

		// 6. Invalidation de cache (produit + variantes + collections + compteurs
		// couleur/matériau — le KPI « produits distincts » ne compte que l'actif)
		getProductInvalidationTags(updatedProduct.slug, updatedProduct.id).forEach((tag) =>
			updateTag(tag),
		);
		getVariantInvalidationTags({
			productId: updatedProduct.id,
			productSlug: updatedProduct.slug,
			colorIds: existingProduct.variants.map((v) => v.colorId),
			materialIds: existingProduct.variants.map((v) => v.materialId),
		}).forEach((tag) => updateTag(tag));
		for (const c of existingProduct.collections) {
			getCollectionInvalidationTags(c.slug).forEach((tag) => updateTag(tag));
		}

		// 7. Succès
		return success(
			updatedProduct.active
				? `« ${updatedProduct.name} » est en vente`
				: `« ${updatedProduct.name} » est masqué de la boutique`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de changer le statut du produit");
	}
}

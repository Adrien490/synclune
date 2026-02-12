"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_BULK_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import { bulkChangeProductStatusSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";

/**
 * Server Action pour changer le statut de plusieurs produits entre DRAFT et PUBLIC
 * Compatible avec useActionState de React 19
 */
export async function bulkChangeProductStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		const targetStatus = formData.get("targetStatus") as string;

		// Parse le JSON des IDs
		let productIds: string[];
		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return validationError("Format des IDs de produits invalide.");
		}

		// 3. Validation avec Zod
		const validation = validateInput(bulkChangeProductStatusSchema, {
			productIds,
			targetStatus,
		});
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier que tous les produits existent et ne sont pas archives
		// Include SKU data for publication validation when targeting PUBLIC
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedData.productIds,
				},
			},
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				collections: { select: { collection: { select: { slug: true } } } },
				skus: {
					select: {
						id: true,
						isActive: true,
						inventory: true,
						images: {
							where: { isPrimary: true },
							select: { id: true },
						},
					},
				},
			},
		});

		if (existingProducts.length !== validatedData.productIds.length) {
			return notFound("Un ou plusieurs produits");
		}

		// 5. Verifier qu'aucun produit n'est archive
		const archivedProducts = existingProducts.filter(
			(p) => p.status === "ARCHIVED"
		);
		if (archivedProducts.length > 0) {
			return validationError(
				"Impossible de changer le statut de produits archives. Veuillez d'abord les restaurer."
			);
		}

		// 5.1 Validation metier : Produits PUBLIC doivent avoir au moins 1 SKU actif avec stock et image
		if (validatedData.targetStatus === "PUBLIC") {
			const invalidProducts: string[] = [];
			for (const product of existingProducts) {
				const pubValidation = validateProductForPublication(product);
				if (!pubValidation.isValid) {
					invalidProducts.push(`"${product.title}"`);
				}
			}
			if (invalidProducts.length > 0) {
				return validationError(
					`Impossible de publier ${invalidProducts.length} produit${invalidProducts.length > 1 ? "s" : ""} : ${invalidProducts.join(", ")}. Chaque produit doit avoir au moins un SKU actif avec du stock et une image.`
				);
			}
		}

		// 6. Mettre a jour le statut
		await prisma.product.updateMany({
			where: {
				id: {
					in: validatedData.productIds,
				},
			},
			data: {
				status: validatedData.targetStatus,
			},
		});

		// 7. Invalidate cache tags pour tous les produits
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			productTags.forEach(tag => updateTag(tag));
		}

		// 7.1 Invalider les caches des collections associees (deduplique)
		const collectionSlugs = new Set<string>();
		for (const product of existingProducts) {
			for (const productCollection of product.collections) {
				collectionSlugs.add(productCollection.collection.slug);
			}
		}
		for (const slug of collectionSlugs) {
			getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));
		}

		// 8. Message de succes
		const count = existingProducts.length;
		const actionLabel =
			validatedData.targetStatus === "PUBLIC" ? "publié" : "mis en brouillon";
		const successMessage = `${count} produit${count > 1 ? "s" : ""} ${actionLabel}${count > 1 ? "s" : ""} avec succès`;

		return success(successMessage, {
			productIds: validatedData.productIds,
			count,
			targetStatus: validatedData.targetStatus,
			products: existingProducts.map((p) => ({
				id: p.id,
				title: p.title,
				slug: p.slug,
			})),
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du changement de statut");
	}
}

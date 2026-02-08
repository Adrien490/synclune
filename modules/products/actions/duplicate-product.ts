"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { generateSlug } from "@/shared/utils/generate-slug";
import { duplicateProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";
import { generateSkuCode } from "@/modules/skus/services/sku-generation.service";
import { getProductForDuplication } from "../data/get-product-for-duplication";

/**
 * Server Action pour dupliquer un produit
 * Duplique le produit et tous ses SKUs avec leurs images
 * Compatible avec useActionState de React 19
 */
export async function duplicateProduct(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
		};

		// 3. Validation avec Zod
		const validation = validateInput(duplicateProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const { productId } = validation.data;

		// 4. Recuperer le produit source avec tous ses SKUs et images (via data/)
		const sourceProduct = await getProductForDuplication(productId);

		if (!sourceProduct) {
			return notFound("Le produit source");
		}

		// 5. Generer le nouveau titre et slug
		const newTitle = `Copie de ${sourceProduct.title}`;
		const newSlug = await generateSlug(prisma, "product", newTitle);

		// 6. Dupliquer le produit et ses SKUs dans une transaction
		const duplicatedProduct = await prisma.$transaction(async (tx) => {
			// Creer le nouveau produit (toujours en DRAFT)
			const createdProduct = await tx.product.create({
				data: {
					title: newTitle,
					slug: newSlug,
					description: sourceProduct.description,
					status: "DRAFT", // Toujours en brouillon pour eviter publication accidentelle
					typeId: sourceProduct.typeId,
				},
				select: {
					id: true,
					title: true,
					slug: true,
					description: true,
					status: true,
					typeId: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			// Dupliquer les associations ProductCollection (many-to-many)
			if (sourceProduct.collections.length > 0) {
				await tx.productCollection.createMany({
					data: sourceProduct.collections.map((pc) => ({
						productId: createdProduct.id,
						collectionId: pc.collectionId,
					})),
				});
			}

			// Dupliquer tous les SKUs
			for (const sourceSku of sourceProduct.skus) {
				// Generer un nouveau SKU unique
				const newSkuValue = generateSkuCode();

				// Creer le nouveau SKU
				const createdSku = await tx.productSku.create({
					data: {
						productId: createdProduct.id,
						sku: newSkuValue,
						priceInclTax: sourceSku.priceInclTax,
						compareAtPrice: sourceSku.compareAtPrice,
						inventory: sourceSku.inventory,
						isActive: sourceSku.isActive,
						isDefault: sourceSku.isDefault,
						colorId: sourceSku.colorId,
						materialId: sourceSku.materialId,
						size: sourceSku.size,
					},
				});

				// Dupliquer toutes les images du SKU
				for (const sourceImage of sourceSku.images) {
					await tx.skuMedia.create({
						data: {
							skuId: createdSku.id,
							url: sourceImage.url,
							thumbnailUrl: sourceImage.thumbnailUrl,
							altText: sourceImage.altText,
							mediaType: sourceImage.mediaType,
							isPrimary: sourceImage.isPrimary,
						},
					});
				}
			}

			return createdProduct;
		});

		// 7. Invalidate cache tags
		const productTags = getProductInvalidationTags(
			duplicatedProduct.slug,
			duplicatedProduct.id
		);
		productTags.forEach(tag => updateTag(tag));

		// Si le produit appartient a des collections, invalider aussi les collections
		for (const pc of sourceProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(pc.collection.slug);
			collectionTags.forEach(tag => updateTag(tag));
		}

		// 8. Success
		return success(`Produit "${duplicatedProduct.title}" dupliqué avec succès.`, {
			productId: duplicatedProduct.id,
			title: duplicatedProduct.title,
			slug: duplicatedProduct.slug,
		});
	} catch (e) {
		return handleActionError(
			e,
			"Une erreur est survenue lors de la duplication du produit."
		);
	}
}

"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/constants/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { duplicateProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";

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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Acces non autorise. Droits administrateur requis.",
			};
		}

		// 2. Extraction des donnees du FormData
		const rawData = {
			productId: formData.get("productId") as string,
		};

		// 3. Validation avec Zod
		const result = duplicateProductSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { productId } = result.data;

		// 4. Recuperer le produit source avec tous ses SKUs et images
		const sourceProduct = await prisma.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				title: true,
				slug: true,
				description: true,
				typeId: true,
				collectionId: true,
				collection: {
					select: {
						slug: true,
					},
				},
				skus: {
					select: {
						sku: true,
						priceInclTax: true,
						compareAtPrice: true,
						inventory: true,
						isActive: true,
						isDefault: true,
						colorId: true,
						material: true,
						size: true,
						images: {
							select: {
								url: true,
								altText: true,
								mediaType: true,
								isPrimary: true,
							},
						},
					},
				},
			},
		});

		if (!sourceProduct) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Le produit source n'existe pas.",
			};
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
					collectionId: sourceProduct.collectionId,
				},
				select: {
					id: true,
					title: true,
					slug: true,
					description: true,
					status: true,
					typeId: true,
					collectionId: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			// Dupliquer tous les SKUs
			for (const sourceSku of sourceProduct.skus) {
				// Generer un nouveau SKU unique
				const newSkuValue = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

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
						material: sourceSku.material,
						size: sourceSku.size,
					},
				});

				// Dupliquer toutes les images du SKU
				for (const sourceImage of sourceSku.images) {
					await tx.skuMedia.create({
						data: {
							skuId: createdSku.id,
							url: sourceImage.url,
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

		// Si le produit appartient a une collection, invalider aussi la collection
		if (sourceProduct.collection) {
			const collectionTags = getCollectionInvalidationTags(
				sourceProduct.collection.slug
			);
			collectionTags.forEach(tag => updateTag(tag));
		}

		// 8. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `Produit "${duplicatedProduct.title}" dupliqué avec succès.`,
			data: {
				productId: duplicatedProduct.id,
				title: duplicatedProduct.title,
				slug: duplicatedProduct.slug,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la duplication du produit.",
		};
	}
}

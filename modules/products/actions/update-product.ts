"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/constants/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { detectMediaType } from "@/shared/utils/media-utils";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { updateProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";

/**
 * Server Action pour modifier un produit existant
 * Le slug n'est PAS modifiable (evite les liens casses et problemes SEO)
 * Permet de modifier le SKU par defaut
 * Compatible avec useActionState de React 19
 */
export async function updateProduct(
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
		// Helper pour parser JSON de maniere safe
		const parseJSON = <T>(value: FormDataEntryValue | null, fallback: T): T => {
			if (value && typeof value === "string") {
				try {
					return JSON.parse(value);
				} catch {
					return fallback;
				}
			}
			return fallback;
		};

		// Extraire les donnees (approche simple comme collection)
		const rawData = {
			productId: formData.get("productId"),
			title: formData.get("title"),
			description: formData.get("description"),
			typeId: formData.get("typeId") || "",
			collectionId: formData.get("collectionId") || "",
			status: formData.get("status"),
			defaultSku: {
				skuId: formData.get("defaultSku.skuId"),
				priceInclTaxEuros: formData.get("defaultSku.priceInclTaxEuros"),
				compareAtPriceEuros: formData.get("defaultSku.compareAtPriceEuros"),
				inventory: formData.get("defaultSku.inventory"),
				isActive: formData.get("defaultSku.isActive"), // Zod fera la coercion
				colorId: formData.get("defaultSku.colorId") || "",
				material: formData.get("defaultSku.material") || "",
				size: formData.get("defaultSku.size") || "",
				primaryImage: parseJSON(formData.get("defaultSku.primaryImage"), undefined),
				galleryMedia: parseJSON(formData.get("defaultSku.galleryMedia"), []),
			},
		};

		// Parse deleted image URLs for UTAPI deletion
		const deletedImageUrls = parseJSON<string[]>(
			formData.get("deletedImageUrls"),
			[]
		);

		// 3. Validation avec Zod
		const result = updateProductSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `${errorPath}: ${firstError.message}`,
			};
		}

		const validatedData = result.data;

		// 4. Verifier que le produit et le SKU existent
		const existingProduct = await prisma.product.findUnique({
			where: { id: validatedData.productId },
			select: {
				id: true,
				slug: true,
				status: true,
				collectionId: true,
				collection: {
					select: { slug: true },
				},
				_count: {
					select: {
						skus: {
							where: { isActive: true },
						},
					},
				},
			},
		});

		if (!existingProduct) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Le produit n'existe pas.",
			};
		}

		// Verifier que le SKU existe et appartient au produit
		const existingSku = await prisma.productSku.findFirst({
			where: {
				id: validatedData.defaultSku.skuId,
				productId: validatedData.productId,
			},
			select: { id: true },
		});

		if (!existingSku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Le SKU n'existe pas ou n'appartient pas au produit.",
			};
		}

		// 5. Validation metier : Produit PUBLIC doit avoir au moins 1 SKU actif
		if (
			validatedData.status === "PUBLIC" &&
			!validatedData.defaultSku.isActive &&
			existingProduct._count.skus === 1
		) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message:
					"Impossible de desactiver le seul SKU d'un produit PUBLIC. Veuillez creer un autre SKU actif ou mettre le produit en DRAFT.",
			};
		}

		// 6. Normalize empty strings to null for optional foreign keys
		const normalizedTypeId = validatedData.typeId?.trim() || null;
		const normalizedCollectionId = validatedData.collectionId?.trim() || null;
		const normalizedColorId = validatedData.defaultSku.colorId?.trim() || null;
		const normalizedMaterial =
			validatedData.defaultSku.material?.trim() || null;
		const normalizedSize = validatedData.defaultSku.size?.trim() || null;
		const normalizedDescription = validatedData.description?.trim() || null;

		// 7. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(
			validatedData.defaultSku.priceInclTaxEuros * 100
		);
		const compareAtPriceCents = validatedData.defaultSku.compareAtPriceEuros
			? Math.round(validatedData.defaultSku.compareAtPriceEuros * 100)
			: null;

		// 8. Combine primary image and gallery images
		const allImages: Array<{
			url: string;
			altText?: string;
			mediaType?: "IMAGE" | "VIDEO";
			isPrimary: boolean;
		}> = [];
		if (validatedData.defaultSku.primaryImage) {
			// VALIDATION: Le media principal DOIT etre une IMAGE (jamais une VIDEO)
			const primaryMediaType =
				validatedData.defaultSku.primaryImage.mediaType ||
				detectMediaType(validatedData.defaultSku.primaryImage.url);
			if (primaryMediaType === "VIDEO") {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Le media principal ne peut pas etre une video. Veuillez selectionner une image comme media principal.",
				};
			}
			allImages.push({
				...validatedData.defaultSku.primaryImage,
				mediaType: "IMAGE", // Force IMAGE type for primary media
				isPrimary: true,
			});
		}
		if (validatedData.defaultSku.galleryMedia) {
			allImages.push(
				...validatedData.defaultSku.galleryMedia.map((media) => ({
					...media,
					isPrimary: false,
				}))
			);
		}

		// 9. Update product in transaction
		const updatedProduct = await prisma.$transaction(async (tx) => {
			// Validate references exist within the transaction
			if (normalizedTypeId) {
				const productType = await tx.productType.findUnique({
					where: { id: normalizedTypeId },
					select: { id: true, isActive: true },
				});
				if (!productType || !productType.isActive) {
					throw new Error(
						"Le type de produit specifie n'existe pas ou n'est pas actif."
					);
				}
			}

			if (normalizedCollectionId) {
				const collection = await tx.collection.findUnique({
					where: { id: normalizedCollectionId },
					select: { id: true },
				});
				if (!collection) {
					throw new Error("La collection specifiee n'existe pas.");
				}
			}

			if (normalizedColorId) {
				const color = await tx.color.findUnique({
					where: { id: normalizedColorId },
					select: { id: true },
				});
				if (!color) {
					throw new Error("La couleur specifiee n'existe pas.");
				}
			}

			// Update product (slug reste inchange)
			const product = await tx.product.update({
				where: { id: validatedData.productId },
				data: {
					title: validatedData.title,
					description: normalizedDescription,
					status: validatedData.status,
					typeId: normalizedTypeId,
					collectionId: normalizedCollectionId,
				},
				select: {
					id: true,
					title: true,
					slug: true,
					description: true,
					status: true,
					typeId: true,
					collectionId: true,
					updatedAt: true,
				},
			});

			// Update SKU
			await tx.productSku.update({
				where: { id: validatedData.defaultSku.skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
					inventory: validatedData.defaultSku.inventory,
					isActive: validatedData.defaultSku.isActive,
					colorId: normalizedColorId,
					material: normalizedMaterial,
					size: normalizedSize,
				},
			});

			// Delete existing images for this SKU
			await tx.skuMedia.deleteMany({
				where: { skuId: validatedData.defaultSku.skuId },
			});

			// Create new SKU images
			if (allImages.length > 0) {
				for (const image of allImages) {
					await tx.skuMedia.create({
						data: {
							skuId: validatedData.defaultSku.skuId,
							url: image.url,
							altText: image.altText || null,
							mediaType:
								image.mediaType || detectMediaType(image.url),
							isPrimary: image.isPrimary,
						},
					});
				}
			}

			return product;
		});

		// 10. Invalidate cache tags
		const productTags = getProductInvalidationTags(
			updatedProduct.slug,
			updatedProduct.id
		);
		productTags.forEach(tag => updateTag(tag));

		// Si l'ancienne collection etait differente, l'invalider aussi
		if (
			existingProduct.collection &&
			existingProduct.collectionId !== updatedProduct.collectionId
		) {
			const oldCollectionTags = getCollectionInvalidationTags(
				existingProduct.collection.slug
			);
			oldCollectionTags.forEach(tag => updateTag(tag));
		}

		// Si le produit appartient a une nouvelle collection, invalider aussi
		if (updatedProduct.collectionId) {
			const collection = await prisma.collection.findUnique({
				where: { id: updatedProduct.collectionId },
				select: { slug: true },
			});
			if (collection) {
				const collectionTags = getCollectionInvalidationTags(collection.slug);
				collectionTags.forEach(tag => updateTag(tag));
			}
		}

		// 11. Delete removed images from UploadThing storage
		if (deletedImageUrls.length > 0) {
			try {
				const utapi = new UTApi();
				await utapi.deleteFiles(deletedImageUrls);
			} catch (error) {
				// Log error but don't fail the request - DB update was successful
// console.error("[UPDATE_PRODUCT] Failed to delete files from UploadThing:", error);
			}
		}

		// 12. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `Produit "${updatedProduct.title}" modifié avec succès.`,
			data: updatedProduct,
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la modification du produit.",
		};
	}
}

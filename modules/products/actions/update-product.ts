"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
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
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

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
		// Parse media from form: primaryImage + galleryMedia → media array
		const primaryImage = parseJSON(
			formData.get("defaultSku.primaryImage"),
			null
		);
		const galleryMedia = parseJSON<unknown[]>(
			formData.get("defaultSku.galleryMedia"),
			[]
		);
		// Combine: primary first, then gallery
		const media = primaryImage ? [primaryImage, ...galleryMedia] : galleryMedia;

		const rawData = {
			productId: formData.get("productId"),
			title: formData.get("title"),
			description: formData.get("description"),
			typeId: formData.get("typeId") || "",
			collectionIds: parseJSON<string[]>(formData.get("collectionIds"), []),
			status: formData.get("status"),
			defaultSku: {
				skuId: formData.get("defaultSku.skuId"),
				priceInclTaxEuros: formData.get("defaultSku.priceInclTaxEuros"),
				compareAtPriceEuros: formData.get("defaultSku.compareAtPriceEuros"),
				inventory: formData.get("defaultSku.inventory"),
				isActive: formData.get("defaultSku.isActive"), // Zod fera la coercion
				colorId: formData.get("defaultSku.colorId") || "",
				materialId: formData.get("defaultSku.materialId") || "",
				size: formData.get("defaultSku.size") || "",
				media,
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
				collections: {
					select: {
						collectionId: true,
						collection: {
							select: { slug: true },
						},
					},
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
		const normalizedCollectionIds = validatedData.collectionIds?.filter((id) => id.trim()) || [];
		const normalizedColorId = validatedData.defaultSku.colorId?.trim() || null;
		const normalizedMaterialId =
			validatedData.defaultSku.materialId?.trim() || null;
		const normalizedSize = validatedData.defaultSku.size?.trim() || null;
		// Sanitisation XSS de la description
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: null;

		// 7. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(
			validatedData.defaultSku.priceInclTaxEuros * 100
		);
		const compareAtPriceCents = validatedData.defaultSku.compareAtPriceEuros
			? Math.round(validatedData.defaultSku.compareAtPriceEuros * 100)
			: null;

		// 8. Prepare images with isPrimary flag (first = primary)
		// Note: La validation que le premier média est une IMAGE (pas VIDEO) est faite
		// dans le schéma Zod (updateProductSchema.refine)
		const allImages = validatedData.defaultSku.media.map((media, index) => ({
			...media,
			mediaType: index === 0 ? ("IMAGE" as const) : media.mediaType, // Force IMAGE for first
			isPrimary: index === 0,
		}));

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

			// Validate all collections exist
			if (normalizedCollectionIds.length > 0) {
				const collections = await tx.collection.findMany({
					where: { id: { in: normalizedCollectionIds } },
					select: { id: true },
				});
				if (collections.length !== normalizedCollectionIds.length) {
					throw new Error("Une ou plusieurs collections specifiees n'existent pas.");
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
				},
				select: {
					id: true,
					title: true,
					slug: true,
					description: true,
					status: true,
					typeId: true,
					updatedAt: true,
				},
			});

			// Update ProductCollection associations (many-to-many)
			// Delete existing associations
			await tx.productCollection.deleteMany({
				where: { productId: validatedData.productId },
			});

			// Create new associations
			if (normalizedCollectionIds.length > 0) {
				await tx.productCollection.createMany({
					data: normalizedCollectionIds.map((collectionId) => ({
						productId: validatedData.productId,
						collectionId,
					})),
				});
			}

			// Update SKU
			await tx.productSku.update({
				where: { id: validatedData.defaultSku.skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
					inventory: validatedData.defaultSku.inventory,
					isActive: validatedData.defaultSku.isActive,
					colorId: normalizedColorId,
					materialId: normalizedMaterialId,
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
							thumbnailUrl: image.thumbnailUrl || null,
							blurDataUrl: image.blurDataUrl || null,
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

		// Invalider les anciennes collections
		for (const pc of existingProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(pc.collection.slug);
			collectionTags.forEach(tag => updateTag(tag));
		}

		// Invalider les nouvelles collections
		if (normalizedCollectionIds.length > 0) {
			const newCollections = await prisma.collection.findMany({
				where: { id: { in: normalizedCollectionIds } },
				select: { slug: true },
			});
			for (const collection of newCollections) {
				const collectionTags = getCollectionInvalidationTags(collection.slug);
				collectionTags.forEach(tag => updateTag(tag));
			}
		}

		// 11. Delete removed images from UploadThing storage
		if (deletedImageUrls.length > 0) {
			try {
				const utapi = new UTApi();
				await utapi.deleteFiles(deletedImageUrls);
			} catch {
				// Silently ignore UploadThing deletion failures
				// DB update already succeeded, orphaned files are acceptable
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

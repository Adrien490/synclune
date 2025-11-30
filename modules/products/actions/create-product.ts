"use server";

import { randomUUID } from "crypto";
import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/constants/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { detectMediaType } from "@/modules/medias/constants/media.constants";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { createProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";

/**
 * Sanitise une chaîne en supprimant les balises HTML potentiellement dangereuses
 * Protection contre XSS pour les champs texte utilisateur
 */
function sanitizeText(text: string): string {
	return text
		.replace(/<[^>]*>/g, "") // Supprime toutes les balises HTML
		.replace(/&lt;/g, "<")   // Decode les entités échappées
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, "/")
		.trim();
}

/**
 * Server Action pour creer un produit
 * Compatible avec useActionState de React 19
 */
export async function createProduct(
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
			title: formData.get("title"),
			description: formData.get("description"),
			typeId: formData.get("typeId") || "",
			collectionIds: parseJSON<string[]>(formData.get("collectionIds"), []),
			status: formData.get("status") || "PUBLIC",
			initialSku: {
				sku: formData.get("initialSku.sku"),
				priceInclTaxEuros: formData.get("initialSku.priceInclTaxEuros"),
				compareAtPriceEuros: formData.get("initialSku.compareAtPriceEuros"),
				inventory: formData.get("initialSku.inventory"),
				// Si le champ n'existe pas dans le FormData, utiliser true par defaut
				// Car z.coerce.boolean(null) = false, ce qui n'est pas le comportement voulu
				isActive: formData.get("initialSku.isActive") ?? true,
				isDefault: formData.get("initialSku.isDefault") ?? true,
				colorId: formData.get("initialSku.colorId") || "",
				materialId: formData.get("initialSku.materialId") || "",
				size: formData.get("initialSku.size") || "",
				primaryImage: parseJSON(formData.get("initialSku.primaryImage"), undefined),
				galleryMedia: parseJSON(formData.get("initialSku.galleryMedia"), []),
			},
		};

		// 3. Validation avec Zod
		const result = createProductSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `${errorPath}: ${firstError.message}`,
			};
		}

		const validatedData = result.data;

		// 3.5. Validation metier : Produit PUBLIC doit avoir un SKU actif
		if (
			validatedData.status === "PUBLIC" &&
			!validatedData.initialSku.isActive
		) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message:
					"Impossible de creer un produit PUBLIC avec un SKU inactif. Veuillez activer le SKU ou creer le produit en DRAFT.",
			};
		}

		// 4. Normalize empty strings to null for optional foreign keys
		const normalizedTypeId = validatedData.typeId?.trim() || null;
		const normalizedCollectionIds = validatedData.collectionIds?.filter((id) => id.trim()) || [];
		const normalizedColorId = validatedData.initialSku.colorId?.trim() || null;
		const normalizedMaterialId = validatedData.initialSku.materialId?.trim() || null;
		const normalizedSize = validatedData.initialSku.size?.trim() || null;
		// Sanitisation XSS de la description
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: null;

		// 5. Generate unique slug
		const finalSlug = await generateSlug(
			prisma,
			"product",
			validatedData.title
		);

		// 6. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(
			validatedData.initialSku.priceInclTaxEuros * 100
		);
		const compareAtPriceCents = validatedData.initialSku.compareAtPriceEuros
			? Math.round(validatedData.initialSku.compareAtPriceEuros * 100)
			: null;

		// 7. Combine primary image and gallery images
		const allImages: Array<{
			url: string;
			thumbnailUrl?: string | null;
			altText?: string;
			mediaType?: "IMAGE" | "VIDEO";
			isPrimary: boolean;
		}> = [];
		if (validatedData.initialSku.primaryImage) {
			// VALIDATION: Le media principal DOIT etre une IMAGE (jamais une VIDEO)
			const primaryMediaType = validatedData.initialSku.primaryImage.mediaType || detectMediaType(validatedData.initialSku.primaryImage.url);
			if (primaryMediaType === "VIDEO") {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message: "Le media principal ne peut pas etre une video. Veuillez selectionner une image comme media principal.",
				};
			}
			allImages.push({
				...validatedData.initialSku.primaryImage,
				mediaType: "IMAGE", // Force IMAGE type for primary media
				isPrimary: true,
			});
		}
		if (validatedData.initialSku.galleryMedia) {
			allImages.push(
				...validatedData.initialSku.galleryMedia.map((media) => ({
					...media,
					isPrimary: false,
				}))
			);
		}

		// 8. Create product in transaction
		const product = await prisma.$transaction(async (tx) => {
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

			// Validate material if provided
			if (normalizedMaterialId) {
				const material = await tx.material.findUnique({
					where: { id: normalizedMaterialId },
					select: { id: true },
				});
				if (!material) {
					throw new Error("Le materiau specifie n'existe pas.");
				}
			}

			// Create product
			const productData = {
				title: validatedData.title,
				slug: finalSlug,
				description: normalizedDescription,
				status: validatedData.status,
				typeId: normalizedTypeId,
			};

			const createdProduct = await tx.product.create({
				data: productData,
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

			// Create ProductCollection associations (many-to-many)
			if (normalizedCollectionIds.length > 0) {
				await tx.productCollection.createMany({
					data: normalizedCollectionIds.map((collectionId) => ({
						productId: createdProduct.id,
						collectionId,
					})),
				});
			}

			// Generate SKU with cryptographically secure random ID
			const skuValue = `SKU-${randomUUID().split("-")[0].toUpperCase()}`;

			const skuData = {
				productId: createdProduct.id,
				sku: skuValue,
				priceInclTax: priceInclTaxCents,
				inventory: validatedData.initialSku.inventory,
				isActive: validatedData.initialSku.isActive,
				isDefault: validatedData.initialSku.isDefault,
				colorId: normalizedColorId,
				materialId: normalizedMaterialId,
				size: normalizedSize,
			};

			// Create initial SKU
			const createdSku = await tx.productSku.create({
				data: {
					...skuData,
					compareAtPrice: compareAtPriceCents,
				},
			});

			// Create SKU images
			if (allImages.length > 0) {
				for (let i = 0; i < allImages.length; i++) {
					const image = allImages[i];
					const imageData = {
						skuId: createdSku.id,
						url: image.url,
						thumbnailUrl: image.thumbnailUrl || null,
						altText: image.altText || null,
						mediaType: image.mediaType || detectMediaType(image.url),
						isPrimary: image.isPrimary,
					};

					await tx.skuMedia.create({
						data: imageData,
					});
				}
			}

			return createdProduct;
		});

		// 9. Invalidate cache tags
		// Invalider le cache produit
		const productTags = getProductInvalidationTags(product.slug, product.id);
		productTags.forEach(tag => updateTag(tag));

		// Si le produit appartient a des collections, invalider aussi les collections
		if (normalizedCollectionIds.length > 0) {
			const collections = await prisma.collection.findMany({
				where: { id: { in: normalizedCollectionIds } },
				select: { slug: true },
			});
			for (const collection of collections) {
				const collectionTags = getCollectionInvalidationTags(collection.slug);
				collectionTags.forEach(tag => updateTag(tag));
			}
		}

		// 10. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: `Produit "${product.title}" créé avec succès${
				product.status === "PUBLIC" ? " et publié" : ""
			}.`,
			data: product,
		};
	} catch (e) {
		// Error handling
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return {
				status: ActionStatus.ERROR,
				message: "Une erreur technique est survenue (slug duplique). Veuillez reessayer.",
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la creation du produit. Veuillez reessayer.",
		};
	}
}

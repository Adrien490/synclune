"use server";

import { randomUUID } from "crypto";
import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { createProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import {
	validateInput,
	success,
	error,
	validationError,
	handleActionError,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { validatePublicProductCreation } from "../services/product-validation.service";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_CREATE_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour creer un produit
 * Compatible avec useActionState de React 19
 */
export async function createProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdminWithUser();
		if ("error" in admin) return admin.error;
		const { user: adminUser } = admin;

		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_CREATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		// Parse media from form: initialSku.media is sent as JSON array
		const media = safeFormGetJSON<unknown[]>(formData, "initialSku.media") ?? [];

		const rawData = {
			title: formData.get("title"),
			description: formData.get("description"),
			typeId: formData.get("typeId") ?? "",
			collectionIds: safeFormGetJSON<string[]>(formData, "collectionIds") ?? [],
			status: formData.get("status") ?? "PUBLIC",
			initialSku: {
				sku: formData.get("initialSku.sku"),
				priceInclTaxEuros: formData.get("initialSku.priceInclTaxEuros"),
				compareAtPriceEuros: formData.get("initialSku.compareAtPriceEuros"),
				inventory: formData.get("initialSku.inventory"),
				// Si le champ n'existe pas dans le FormData, utiliser true par defaut
				// Car z.coerce.boolean(null) = false, ce qui n'est pas le comportement voulu
				isActive: formData.get("initialSku.isActive") ?? true,
				isDefault: formData.get("initialSku.isDefault") ?? true,
				colorId: formData.get("initialSku.colorId") ?? "",
				materialId: formData.get("initialSku.materialId") ?? "",
				size: formData.get("initialSku.size") ?? "",
				media,
			},
		};

		// 3. Validation avec Zod
		const validation = validateInput(createProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 3.5. Validation metier : Produit PUBLIC doit avoir un SKU actif
		if (validatedData.status === "PUBLIC") {
			const validation = validatePublicProductCreation(validatedData.initialSku);
			if (!validation.isValid) {
				return validationError(validation.errorMessage!);
			}
		}

		// 4. Normalize empty strings to null for optional foreign keys
		const normalizedTypeId = validatedData.typeId?.trim() ?? null;
		const normalizedCollectionIds = validatedData.collectionIds;
		const normalizedColorId = validatedData.initialSku.colorId?.trim() ?? null;
		const normalizedMaterialId = validatedData.initialSku.materialId?.trim() ?? null;
		const normalizedSize = validatedData.initialSku.size?.trim() ?? null;
		// Sanitisation XSS de la description
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: null;

		// 5. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(validatedData.initialSku.priceInclTaxEuros * 100);
		const compareAtPriceCents = validatedData.initialSku.compareAtPriceEuros
			? Math.round(validatedData.initialSku.compareAtPriceEuros * 100)
			: null;

		// 6. Prepare images with isPrimary flag (first = primary)
		// Note: La validation que le premier média est une IMAGE (pas VIDEO) est faite
		// dans le schéma Zod (createProductSchema.refine)
		const allImages = validatedData.initialSku.media.map((media, index) => ({
			...media,
			mediaType: index === 0 ? ("IMAGE" as const) : media.mediaType, // Force IMAGE for first
			isPrimary: index === 0,
			position: index,
		}));

		// 7. Create product in transaction
		const { product, collectionSlugs } = await prisma.$transaction(async (tx) => {
			// Generate unique slug INSIDE transaction to prevent race conditions
			const finalSlug = await generateSlug(tx, "product", validatedData.title);

			// Validate references exist within the transaction
			if (normalizedTypeId) {
				const productType = await tx.productType.findUnique({
					where: { id: normalizedTypeId },
					select: { id: true, isActive: true },
				});
				if (!productType || !productType.isActive) {
					throw new Error("Le type de produit spécifié n'existe pas ou n'est pas actif.");
				}
			}

			// Validate all collections exist and capture slugs inside the transaction
			// to avoid a race condition where a collection is deleted between the
			// transaction commit and the post-transaction fetch.
			let fetchedCollectionSlugs: string[] = [];
			if (normalizedCollectionIds.length > 0) {
				const collections = await tx.collection.findMany({
					where: { id: { in: normalizedCollectionIds } },
					select: { id: true, slug: true },
				});
				if (collections.length !== normalizedCollectionIds.length) {
					throw new Error("Une ou plusieurs collections spécifiées n'existent pas.");
				}
				fetchedCollectionSlugs = collections.map((c) => c.slug);
			}

			if (normalizedColorId) {
				const color = await tx.color.findUnique({
					where: { id: normalizedColorId },
					select: { id: true },
				});
				if (!color) {
					throw new Error("La couleur spécifiée n'existe pas.");
				}
			}

			// Validate material if provided
			if (normalizedMaterialId) {
				const material = await tx.material.findUnique({
					where: { id: normalizedMaterialId },
					select: { id: true },
				});
				if (!material) {
					throw new Error("Le matériau spécifié n'existe pas.");
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
			const skuValue = `SKU-${(randomUUID().split("-")[0] ?? "").toUpperCase()}`;

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
					if (!image) continue;
					const imageData = {
						skuId: createdSku.id,
						url: image.url,
						thumbnailUrl: image.thumbnailUrl ?? null,
						blurDataUrl: image.blurDataUrl ?? null,
						altText: image.altText ?? null,
						mediaType: image.mediaType ?? detectMediaType(image.url),
						isPrimary: image.isPrimary,
						position: image.position,
					};

					await tx.skuMedia.create({
						data: imageData,
					});
				}
			}

			return { product: createdProduct, collectionSlugs: fetchedCollectionSlugs };
		});

		// 8. Invalidate cache tags
		// Invalider le cache produit
		const productTags = getProductInvalidationTags(product.slug, product.id);
		productTags.forEach((tag) => updateTag(tag));

		// Invalider les caches des collections (slugs captures dans la transaction)
		for (const slug of collectionSlugs) {
			const collectionTags = getCollectionInvalidationTags(slug);
			collectionTags.forEach((tag) => updateTag(tag));
		}

		// 9. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "product.create",
			targetType: "product",
			targetId: product.id,
			metadata: { title: product.title, slug: product.slug, status: product.status },
		});

		// 10. Success
		return success(
			`Produit "${product.title}" créé avec succès${
				product.status === "PUBLIC" ? " et publié" : ""
			}.`,
			product,
		);
	} catch (e) {
		// Gestion spéciale des contraintes d'unicité (slug)
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return error("Une erreur technique est survenue. Veuillez reessayer.");
		}
		return handleActionError(e, "Une erreur est survenue lors de la creation du produit.");
	}
}

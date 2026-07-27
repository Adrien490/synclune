"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import {
	validateInput,
	success,
	notFound,
	validationError,
	handleActionError,
	safeFormGetJSON,
	BusinessError,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { updateProductSchema } from "../schemas/product.schemas";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_PRODUCT_UPDATE_LIMIT } from "@/shared/lib/rate-limit-config";

/**
 * Server Action pour modifier un produit existant
 * Le slug n'est PAS modifiable (evite les liens casses et problemes SEO)
 * Permet de modifier le SKU par defaut
 * Compatible avec useActionState de React 19
 */
export async function updateProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 1.1 Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_UPDATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extraction des donnees du FormData
		const media = safeFormGetJSON<unknown[]>(formData, "defaultSku.media") ?? [];
		// Couleurs M2M sérialisées en JSON (1re = principale)
		const defaultSkuColorIds = safeFormGetJSON<string[]>(formData, "defaultSku.colorIds") ?? [];
		// Matériaux M2M sérialisés en JSON (cohérent avec collectionIds)
		const defaultSkuMaterialIds =
			safeFormGetJSON<string[]>(formData, "defaultSku.materialIds") ?? [];

		const rawData = {
			productId: formData.get("productId"),
			title: formData.get("title"),
			description: formData.get("description"),
			typeId: formData.get("typeId") ?? "",
			collectionIds: safeFormGetJSON<string[]>(formData, "collectionIds") ?? [],
			status: formData.get("status"),
			defaultSku: {
				skuId: formData.get("defaultSku.skuId"),
				priceInclTaxEuros: formData.get("defaultSku.priceInclTaxEuros"),
				compareAtPriceEuros: formData.get("defaultSku.compareAtPriceEuros"),
				inventory: formData.get("defaultSku.inventory"),
				isActive: formData.get("defaultSku.isActive"), // Zod fera la coercion
				colorIds: defaultSkuColorIds,
				materialIds: defaultSkuMaterialIds,
				size: formData.get("defaultSku.size") ?? "",
				media,
			},
		};

		// Parse and validate deleted image URLs for UTAPI deletion
		const rawDeletedImageUrls = safeFormGetJSON<unknown[]>(formData, "deletedImageUrls") ?? [];
		const deletedImageUrls = rawDeletedImageUrls.filter(
			(url): url is string => typeof url === "string" && url.length > 0 && url.length <= 2048,
		);

		// 3. Validation avec Zod
		const validation = validateInput(updateProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier que le produit et le SKU existent
		// Le select charge aussi title + skus (avec stock + isPrimary image) pour
		// permettre validateProductForPublication ci-dessous sans seconde requete.
		// deletedAt: null — meme garde que `toggle-product-status.ts`. Sans elle, cette
		// action pouvait editer un produit soft-deleted et lui reecrire `status: PUBLIC`,
		// fabriquant l'etat `PUBLIC` + `deletedAt` que le reste du catalogue traite comme
		// impossible : la vitrine reste protegee (`notDeleted` partout), mais les gardes
		// d'ECRITURE qui ne filtrent que le statut s'y cassent — `delete-product-type`
		// refuserait a jamais un type « ayant des produits PUBLIC » invisibles, et les
		// gardes « derniere variante active d'un produit PUBLIC » se declencheraient sur
		// un produit supprime. Aucune surface admin n'expose un produit soft-deleted
		// (il n'y a volontairement pas de restore-product), donc c'est un durcissement.
		const existingProduct = await prisma.product.findUnique({
			where: { id: validatedData.productId, deletedAt: null },
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				// Necessaire pour distinguer « le type change » de « le type est juste
				// reconduit » : seul le premier cas exige un type actif (cf. etape 9).
				typeId: true,
				collections: {
					select: {
						collectionId: true,
						collection: {
							select: { slug: true },
						},
					},
				},
				skus: {
					where: { deletedAt: null },
					select: {
						id: true,
						isActive: true,
						inventory: true,
						// MEDIA-AUDIT-002 : type de chaque media pour exiger une vraie image.
						images: { select: { mediaType: true } },
					},
				},
			},
		});

		if (!existingProduct) {
			return notFound("Le produit");
		}

		// Verifier que le SKU existe et appartient au produit
		const existingSku = await prisma.productSku.findFirst({
			where: {
				id: validatedData.defaultSku.skuId,
				productId: validatedData.productId,
			},
			select: { id: true, isDefault: true, isActive: true },
		});

		if (!existingSku) {
			return notFound("La variante");
		}

		// 5. Validation metier : refus de desactiver la variante principale (alignement
		// avec update-sku-status.ts). Si l'admin veut deplacer le defaut, il doit
		// d'abord promouvoir une autre variante via setDefaultSku.
		if (existingSku.isDefault && !validatedData.defaultSku.isActive) {
			return validationError(
				"Impossible de désactiver la variante principale. Définissez d'abord une autre variante comme principale.",
			);
		}

		// 5.5. Validation publication complete pour status=PUBLIC : projection de
		// l'etat post-update du defaultSku sur le reste des SKUs du produit, puis
		// passage dans validateProductForPublication (titre + >=1 SKU actif avec
		// stock + image). Aligne updateProduct sur toggleProductStatus.
		if (validatedData.status === "PUBLIC") {
			// Projection: le defaultSku herite des nouvelles valeurs envoyees
			const projectedSkus = existingProduct.skus.map((s) =>
				s.id === validatedData.defaultSku.skuId
					? {
							id: s.id,
							isActive: validatedData.defaultSku.isActive,
							inventory: validatedData.defaultSku.inventory,
							// Le schema Zod garantit media.length > 0 ET premier media = IMAGE sur
							// defaultSku (updateProductSchema refines) → presence d'image garantie.
							images:
								validatedData.defaultSku.media.length > 0 ? [{ mediaType: "IMAGE" as const }] : [],
						}
					: s,
			);
			const pubCheck = validateProductForPublication({
				title: validatedData.title,
				skus: projectedSkus,
			});
			if (!pubCheck.isValid) {
				return validationError(pubCheck.errorMessage!);
			}
		}

		// 6. Normalize empty strings to null for optional foreign keys
		const normalizedTypeId = validatedData.typeId?.trim() ?? null;
		// Un type desactive (retire de la taxonomie) ne doit pas bloquer l'edition des
		// produits qui le referencent DEJA : `getProductTypeOptions` filtre isActive,
		// donc le formulaire resoumet un id que l'admin ne voit meme pas dans le select.
		// On n'exige un type actif que lorsqu'il CHANGE reellement.
		const typeIdChanged = normalizedTypeId !== existingProduct.typeId;
		const normalizedCollectionIds = validatedData.collectionIds;
		// Dedupe (préserve l'ordre saisi, 1er = principal)
		const normalizedColorIds = Array.from(new Set(validatedData.defaultSku.colorIds));
		const normalizedMaterialIds = Array.from(new Set(validatedData.defaultSku.materialIds));
		const normalizedSize = validatedData.defaultSku.size?.trim() ?? null;
		// Sanitisation XSS de la description
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: null;

		// 7. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(validatedData.defaultSku.priceInclTaxEuros * 100);
		const compareAtPriceCents = validatedData.defaultSku.compareAtPriceEuros
			? Math.round(validatedData.defaultSku.compareAtPriceEuros * 100)
			: null;

		// 8. Prepare images with isPrimary flag (first = primary)
		// La validation que le premier média est une IMAGE (pas VIDEO) est faite
		// dans le schéma Zod (updateProductSchema.refine). On signale toute violation
		// d'invariant pour détecter un éventuel bypass du schéma.
		const firstMedia = validatedData.defaultSku.media[0];
		if (firstMedia?.mediaType === "VIDEO") {
			logger.warn("Schema invariant violated: first media is VIDEO post-validation", {
				action: "updateProduct",
				productId: validatedData.productId,
				skuId: validatedData.defaultSku.skuId,
			});
		}
		const allImages = validatedData.defaultSku.media.map((media, index) => ({
			...media,
			isPrimary: index === 0,
			position: index,
		}));

		// 9. Update product in transaction
		const updatedProduct = await prisma.$transaction(async (tx) => {
			// Validate references exist within the transaction
			if (normalizedTypeId) {
				const productType = await tx.productType.findUnique({
					where: { id: normalizedTypeId },
					select: { id: true, isActive: true },
				});
				// Existence : inconditionnelle (un id fantome est toujours une erreur).
				if (!productType) {
					throw new BusinessError("Le type de bijou sélectionné n'existe pas.");
				}
				// isActive : uniquement sur changement (cf. `typeIdChanged` etape 6).
				if (typeIdChanged && !productType.isActive) {
					throw new BusinessError(
						"Le type de bijou sélectionné est désactivé. Choisissez un type actif.",
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
					throw new Error("Une ou plusieurs collections spécifiées n'existent pas.");
				}
			}

			// Validate colors if provided (M2M)
			if (normalizedColorIds.length > 0) {
				const colors = await tx.color.findMany({
					where: { id: { in: normalizedColorIds } },
					select: { id: true },
				});
				if (colors.length !== normalizedColorIds.length) {
					throw new Error("Une ou plusieurs couleurs spécifiées n'existent pas.");
				}
			}

			// Validate materials if provided (M2M)
			if (normalizedMaterialIds.length > 0) {
				const materials = await tx.material.findMany({
					where: { id: { in: normalizedMaterialIds } },
					select: { id: true },
				});
				if (materials.length !== normalizedMaterialIds.length) {
					throw new Error("Un ou plusieurs matériaux spécifiés n'existent pas.");
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

			// Update SKU + sync couleurs & matériaux M2M (delete-all + create pour préserver l'ordre)
			await tx.productSku.update({
				where: { id: validatedData.defaultSku.skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
					inventory: validatedData.defaultSku.inventory,
					isActive: validatedData.defaultSku.isActive,
					size: normalizedSize,
					colors: {
						deleteMany: {},
						create: normalizedColorIds.map((colorId, index) => ({
							colorId,
							position: index,
						})),
					},
					materials: {
						deleteMany: {},
						create: normalizedMaterialIds.map((materialId, index) => ({
							materialId,
							position: index,
						})),
					},
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
							thumbnailUrl: image.thumbnailUrl ?? null,
							blurDataUrl: image.blurDataUrl ?? null,
							altText: image.altText ?? null,
							mediaType: image.mediaType ?? detectMediaType(image.url),
							width: image.width ?? null,
							height: image.height ?? null,
							isPrimary: image.isPrimary,
							position: image.position,
						},
					});
				}
			}

			return product;
		});

		// 10. Invalidate cache tags
		const productTags = getProductInvalidationTags(updatedProduct.slug, updatedProduct.id);
		productTags.forEach((tag) => updateTag(tag));

		// Invalider le cache stock temps réel du SKU modifié
		updateTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(validatedData.defaultSku.skuId));

		// Invalider les anciennes collections
		for (const pc of existingProduct.collections) {
			const collectionTags = getCollectionInvalidationTags(pc.collection.slug);
			collectionTags.forEach((tag) => updateTag(tag));
		}

		// Invalider les nouvelles collections
		if (normalizedCollectionIds.length > 0) {
			const newCollections = await prisma.collection.findMany({
				where: { id: { in: normalizedCollectionIds } },
				select: { slug: true },
			});
			for (const collection of newCollections) {
				const collectionTags = getCollectionInvalidationTags(collection.slug);
				collectionTags.forEach((tag) => updateTag(tag));
			}
		}

		// 11. Delete removed images from UploadThing storage.
		// MEDIA-AUDIT-003 : ne jamais supprimer un fichier encore référencé par un
		// snapshot de commande (OrderItem.productImageUrl / skuImageUrl) — sinon
		// l'historique client afficherait une image 404 (rétention légale 10 ans).
		// Les URLs préservées seront ramassées plus tard par cleanup-orphan-media
		// SI plus aucune commande n'y fait référence (le cron est OrderItem-aware).
		if (deletedImageUrls.length > 0) {
			void (async () => {
				try {
					const referencingItems = await prisma.orderItem.findMany({
						where: {
							OR: [
								{ productImageUrl: { in: deletedImageUrls } },
								{ skuImageUrl: { in: deletedImageUrls } },
							],
						},
						select: { productImageUrl: true, skuImageUrl: true },
					});
					const referencedUrls = new Set<string>();
					for (const item of referencingItems) {
						if (item.productImageUrl) referencedUrls.add(item.productImageUrl);
						if (item.skuImageUrl) referencedUrls.add(item.skuImageUrl);
					}
					const deletableUrls = deletedImageUrls.filter((url) => !referencedUrls.has(url));
					if (referencedUrls.size > 0) {
						logger.info("Preserved order-referenced media from deletion", {
							action: "updateProduct",
							preserved: referencedUrls.size,
							deleted: deletableUrls.length,
						});
					}
					if (deletableUrls.length > 0) {
						await deleteUploadThingFilesFromUrls(deletableUrls);
					}
				} catch (e) {
					// En cas d'erreur on NE supprime PAS (préservation de l'historique) ;
					// cleanup-orphan-media ramassera les vrais orphelins ultérieurement.
					logger.error("Failed to delete UploadThing files", e, { action: "updateProduct" });
				}
			})();
		}

		// 12. Audit log

		// 13. Success
		return success(`Bijou « ${updatedProduct.title} » peaufiné`, updatedProduct);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le produit");
	}
}

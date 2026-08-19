"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { applyStockDeltaTx } from "@/modules/variants/services/apply-stock-delta.service";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE } from "@/modules/media/constants/media-limits.constants";
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
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";
import { updateProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import { getVariantInvalidationTags } from "@/modules/variants/utils/cache.utils";
import { validateProductForPublication } from "../services/product-validation.service";

/**
 * Server Action pour modifier un produit existant — schéma lean (lot 2).
 * Le slug n'est PAS modifiable (liens SEO). Édite aussi la variante principale
 * et les médias du PRODUIT.
 */
export async function updateProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction des données du FormData
		const media = safeFormGetJSON<unknown[]>(formData, "media") ?? [];

		const rawData = {
			productId: formData.get("productId"),
			name: formData.get("name"),
			description: formData.get("description"),
			priceEuros: formData.get("priceEuros"),
			active: formData.get("active"),
			typeId: formData.get("typeId") ?? "",
			collectionIds: safeFormGetJSON<string[]>(formData, "collectionIds") ?? [],
			media,
			defaultVariant: {
				variantId: formData.get("defaultVariant.variantId"),
				priceEuros: formData.get("defaultVariant.priceEuros") ?? "",
				stock: formData.get("defaultVariant.stock"),
				originalStock: formData.get("defaultVariant.originalStock") ?? undefined,
				active: formData.get("defaultVariant.active"),
				colorId: formData.get("defaultVariant.colorId") ?? "",
				materialId: formData.get("defaultVariant.materialId") ?? "",
				size: formData.get("defaultVariant.size") ?? "",
			},
		};

		const rawDeletedImageUrls = safeFormGetJSON<unknown[]>(formData, "deletedImageUrls") ?? [];
		const deletedImageUrls = rawDeletedImageUrls.filter(
			(url): url is string => typeof url === "string" && url.length > 0 && url.length <= 2048,
		);

		// 3. Validation avec Zod
		const validation = validateInput(updateProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Existence produit + variante
		const existingProduct = await prisma.product.findUnique({
			where: { id: validatedData.productId },
			select: {
				id: true,
				name: true,
				slug: true,
				active: true,
				collections: { select: { id: true, slug: true } },
				variants: { select: { id: true, active: true, stock: true } },
				media: { select: { type: true } },
			},
		});

		if (!existingProduct) {
			return notFound("Produit");
		}

		const existingVariant = existingProduct.variants.find(
			(v) => v.id === validatedData.defaultVariant.variantId,
		);
		if (!existingVariant) {
			return notFound("Variante", "f");
		}

		// 5. Validation métier : un produit ACTIF doit rester publiable après update
		if (validatedData.active) {
			const projectedVariants = existingProduct.variants.map((v) =>
				v.id === validatedData.defaultVariant.variantId
					? {
							id: v.id,
							active: validatedData.defaultVariant.active,
							stock: validatedData.defaultVariant.stock,
						}
					: v,
			);
			const projectedMedia = validatedData.media.map((m, index) => ({
				type: index === 0 ? ("IMAGE" as const) : (m.type ?? detectMediaType(m.url)),
			}));
			const pubCheck = validateProductForPublication({
				name: validatedData.name,
				variants: projectedVariants,
				media: projectedMedia,
			});
			if (!pubCheck.isValid) {
				return validationError(pubCheck.errorMessage!);
			}
		}

		// 6. Normalisation
		const normalizedCollectionIds = validatedData.collectionIds;
		const normalizedSize = validatedData.defaultVariant.size?.trim() ?? null;
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: "";

		// 7. Prix en centimes
		const productPriceCents = Math.round(validatedData.priceEuros * 100);
		const variantPriceCents = validatedData.defaultVariant.priceEuros
			? Math.round(validatedData.defaultVariant.priceEuros * 100)
			: null;

		// 8. Médias (premier = principal, forcé IMAGE — filet anti-bypass du schéma)
		const firstMedia = validatedData.media[0];
		if (firstMedia?.type === "VIDEO") {
			logger.warn("Schema invariant violated: first media is VIDEO post-validation", {
				action: "updateProduct",
				productId: validatedData.productId,
			});
			return validationError(PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE);
		}
		const allMedia = validatedData.media.map((m, index) => ({
			url: m.url,
			alt: m.alt ?? null,
			type: index === 0 ? ("IMAGE" as const) : (m.type ?? detectMediaType(m.url)),
			blurDataUrl: m.blurDataUrl ?? null,
			position: index,
		}));

		// 9. Update en transaction
		const { product: updatedProduct, oldProductMediaUrls } = await prisma.$transaction(
			async (tx) => {
				// Collections : existence
				if (normalizedCollectionIds.length > 0) {
					const collections = await tx.collection.findMany({
						where: { id: { in: normalizedCollectionIds } },
						select: { id: true },
					});
					if (collections.length !== normalizedCollectionIds.length) {
						throw new BusinessError("Une ou plusieurs collections spécifiées n'existent pas.");
					}
				}
				// Couleur / matériau : existence
				if (validatedData.defaultVariant.colorId) {
					const color = await tx.color.findUnique({
						where: { id: validatedData.defaultVariant.colorId },
						select: { id: true },
					});
					if (!color) throw new BusinessError("La couleur sélectionnée n'existe pas.");
				}
				if (validatedData.defaultVariant.materialId) {
					const material = await tx.material.findUnique({
						where: { id: validatedData.defaultVariant.materialId },
						select: { id: true },
					});
					if (!material) throw new BusinessError("Le matériau sélectionné n'existe pas.");
				}

				// Update produit (slug inchangé) + resynchronisation M-N collections
				const product = await tx.product.update({
					where: { id: validatedData.productId },
					data: {
						name: validatedData.name,
						description: normalizedDescription,
						priceCents: productPriceCents,
						active: validatedData.active,
						typeId: validatedData.typeId ?? null,
						collections: {
							set: normalizedCollectionIds.map((id) => ({ id })),
						},
					},
					select: {
						id: true,
						name: true,
						slug: true,
						active: true,
						updatedAt: true,
					},
				});

				// Verrou ligne + DELTA relatif au stock affiché (anti stock fantôme —
				// SSOT applyStockDeltaTx, cf. son docblock).
				const stockDelta = await applyStockDeltaTx(tx, {
					variantId: validatedData.defaultVariant.variantId,
					targetStock: validatedData.defaultVariant.stock,
					originalStock: validatedData.defaultVariant.originalStock,
					fallbackStock: existingVariant.stock,
				});

				await tx.productVariant.update({
					where: { id: validatedData.defaultVariant.variantId },
					data: {
						priceCents: variantPriceCents,
						stock: { increment: stockDelta },
						active: validatedData.defaultVariant.active,
						size: normalizedSize,
						colorId: validatedData.defaultVariant.colorId ?? null,
						materialId: validatedData.defaultVariant.materialId ?? null,
					},
				});

				// URLs possédées AVANT le deleteMany : `deletedImageUrls` vient du
				// client — sans recoupement, un appel RPC direct pourrait supprimer
				// n'importe quel blob UploadThing.
				const oldMedia = await tx.productMedia.findMany({
					where: { productId: validatedData.productId },
					select: { url: true },
				});

				// Resynchronisation des médias du produit
				await tx.productMedia.deleteMany({
					where: { productId: validatedData.productId },
				});
				if (allMedia.length > 0) {
					await tx.productMedia.createMany({
						data: allMedia.map((m) => ({ ...m, productId: validatedData.productId })),
					});
				}

				return {
					product,
					oldProductMediaUrls: new Set(oldMedia.map((m) => m.url)),
				};
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// 10. Invalidation de cache
		getProductInvalidationTags(updatedProduct.slug, updatedProduct.id).forEach((tag) =>
			updateTag(tag),
		);
		getVariantInvalidationTags({
			variantId: validatedData.defaultVariant.variantId,
			productId: updatedProduct.id,
			productSlug: updatedProduct.slug,
			colorIds: [validatedData.defaultVariant.colorId],
			materialIds: [validatedData.defaultVariant.materialId],
		}).forEach((tag) => updateTag(tag));

		// Anciennes ET nouvelles collections
		for (const c of existingProduct.collections) {
			getCollectionInvalidationTags(c.slug).forEach((tag) => updateTag(tag));
		}
		if (normalizedCollectionIds.length > 0) {
			const newCollections = await prisma.collection.findMany({
				where: { id: { in: normalizedCollectionIds } },
				select: { slug: true },
			});
			for (const collection of newCollections) {
				getCollectionInvalidationTags(collection.slug).forEach((tag) => updateTag(tag));
			}
		}

		// 11. Purge UploadThing des médias retirés (via la SSOT qui préserve les
		// URLs encore référencées ailleurs). `after()` : en serverless, la lambda
		// peut geler avant une promesse détachée.
		const ownedDeletedUrls = deletedImageUrls.filter((url) => oldProductMediaUrls.has(url));
		if (ownedDeletedUrls.length > 0) {
			after(() => deleteUnreferencedCatalogMedia(ownedDeletedUrls, { action: "updateProduct" }));
		}

		// 12. Succès
		return success(`Bijou « ${updatedProduct.name} » peaufiné`, updatedProduct);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le produit");
	}
}

"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { applyInventoryDeltaTx } from "@/modules/skus/services/apply-inventory-delta.service";
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
import { getSkuInvalidationTags } from "@/modules/skus/utils/cache.utils";
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
				originalInventory: formData.get("defaultSku.originalInventory") ?? undefined,
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
		// Le select charge aussi title + skus (avec stock + mediaType des images) pour
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
						position: true,
						inventory: true,
						// MEDIA-AUDIT-002 : type de chaque media pour exiger une vraie image.
						images: { select: { mediaType: true } },
					},
				},
			},
		});

		if (!existingProduct) {
			return notFound("Produit");
		}

		// Verifier que le SKU existe et appartient au produit.
		// `deletedAt: null` — même garde que les mutateurs du module skus : un SKU
		// soft-deleted ne doit pas être éditable via le formulaire produit.
		const existingSku = await prisma.productSku.findFirst({
			where: {
				id: validatedData.defaultSku.skuId,
				productId: validatedData.productId,
				deletedAt: null,
			},
			select: { id: true, sku: true, isActive: true },
		});

		if (!existingSku) {
			return notFound("Variante", "f");
		}

		// 5. Validation metier : refus de DESACTIVER la variante principale (alignement
		// avec update-sku-status.ts). Si l'admin veut deplacer le defaut, il doit
		// d'abord promouvoir une autre variante via setDefaultSku.
		// « Principale » = rang 0 de (position asc, id asc) depuis le remplacement
		// d'`isDefault` par `position` (audit schéma V5, lot A2).
		// La garde ne vise que la TRANSITION actif → inactif : sur un produit
		// archive, le defaut est deja inactif et le formulaire reposte son etat —
		// bloquer ce non-changement re-briquerait l'edition des produits archives.
		const rankZeroSku = [...existingProduct.skus].sort(
			(a, b) => a.position - b.position || a.id.localeCompare(b.id),
		)[0];
		const isRepresentative = rankZeroSku?.id === existingSku.id;
		if (isRepresentative && existingSku.isActive && !validatedData.defaultSku.isActive) {
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
		// Remplis dans la transaction (requêtes d'existence), consommés à l'étape 10.
		let affectedColorSlugs: string[] = [];
		let affectedMaterialSlugs: string[] = [];
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

		// 8. Prepare images (premier = principal via position 0)
		// La validation que le premier média est une IMAGE (pas VIDEO) est faite
		// dans le schéma Zod (updateProductSchema.refine). Filet anti-bypass : on
		// REFUSE (le précédent `logger.warn` signalait la violation… puis
		// persistait quand même une vidéo en primaire).
		const firstMedia = validatedData.defaultSku.media[0];
		if (firstMedia?.mediaType === "VIDEO") {
			logger.warn("Schema invariant violated: first media is VIDEO post-validation", {
				action: "updateProduct",
				productId: validatedData.productId,
				skuId: validatedData.defaultSku.skuId,
			});
			return validationError(PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE);
		}
		const allImages = validatedData.defaultSku.media.map((media, index) => ({
			...media,
			position: index,
		}));

		// 9. Update product in transaction
		const { product: updatedProduct, oldSkuMediaUrls } = await prisma.$transaction(
			async (tx) => {
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
							"Le type de bijou sélectionné est désactivé. Choisis un type actif.",
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
						select: { id: true, slug: true },
					});
					if (colors.length !== normalizedColorIds.length) {
						throw new Error("Une ou plusieurs couleurs spécifiées n'existent pas.");
					}
					// Slugs récupérés au passage : l'invalidation des tags couleurs les exige
					// (cf. étape 10) et cette requête d'existence est déjà payée.
					affectedColorSlugs = colors.map((c) => c.slug);
				}

				// Validate materials if provided (M2M)
				if (normalizedMaterialIds.length > 0) {
					const materials = await tx.material.findMany({
						where: { id: { in: normalizedMaterialIds } },
						select: { id: true, slug: true },
					});
					if (materials.length !== normalizedMaterialIds.length) {
						throw new Error("Un ou plusieurs matériaux spécifiés n'existent pas.");
					}
					affectedMaterialSlugs = materials.map((m) => m.slug);
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

				// Verrou ligne + DELTA relatif au stock affiché à l'admin, au lieu du set
				// absolu `inventory: validatedData.defaultSku.inventory` qui régnait ici.
				// C'était le bug corrigé sur `update-sku` deux mois plus tôt, resté vivant sur
				// CE formulaire — le plus utilisé, puisqu'il édite le SKU des produits
				// mono-variante. SSOT : `applyInventoryDeltaTx` (docblock = le détail).
				const inventoryDelta = await applyInventoryDeltaTx(tx, {
					skuId: validatedData.defaultSku.skuId,
					targetInventory: validatedData.defaultSku.inventory,
					originalInventory: validatedData.defaultSku.originalInventory,
					fallbackInventory:
						existingProduct.skus.find((s) => s.id === validatedData.defaultSku.skuId)?.inventory ??
						validatedData.defaultSku.inventory,
				});

				// Update SKU + sync couleurs & matériaux M2M (delete-all + create pour préserver l'ordre)
				await tx.productSku.update({
					where: { id: validatedData.defaultSku.skuId },
					data: {
						priceInclTax: priceInclTaxCents,
						compareAtPrice: compareAtPriceCents,
						inventory: { increment: inventoryDelta },
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

				// Capture des URLs réellement possédées par le SKU AVANT le deleteMany :
				// `deletedImageUrls` vient du client et est le paramètre le plus
				// destructif de l'action — sans recoupement, un appel RPC direct
				// pouvait faire supprimer n'importe quel blob UploadThing.
				const oldMedia = await tx.skuMedia.findMany({
					where: { skuId: validatedData.defaultSku.skuId },
					select: { url: true, thumbnailUrl: true },
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
								position: image.position,
							},
						});
					}
				}

				const skuMediaUrls = new Set<string>();
				for (const media of oldMedia) {
					skuMediaUrls.add(media.url);
					if (media.thumbnailUrl) skuMediaUrls.add(media.thumbnailUrl);
				}
				return { product, oldSkuMediaUrls: skuMediaUrls };
			},
			// Cette transaction tient advisory lock d'identité de variante + FOR UPDATE sur l'inventaire.
			// Le défaut Prisma (5 s) la faisait échouer en P2028 sous contention avec le
			// webhook d'encaissement, qui verrouille les mêmes lignes avec 30 s — l'admin
			// voyait une erreur générique non déterministe. Prescrit par prisma-tx-options.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// 10. Invalidate cache tags
		const productTags = getProductInvalidationTags(updatedProduct.slug, updatedProduct.id);
		productTags.forEach((tag) => updateTag(tag));

		// Invalidation SKU complète — ce formulaire mute le prix, le stock, le statut,
		// la taille ET les M2M couleurs/matériaux du SKU par défaut. Il ne postait qu'un
		// `SKU_STOCK` isolé (STOCK-STALE-BASELINE-001) : le détail SKU par id restait
		// donc stale, et c'est lui qui alimente la baseline `originalInventory` du delta.
		// `getSkuInvalidationTags` est la SSOT partagée avec les mutateurs de
		// `modules/skus` — passer par elle évite de re-diverger tag par tag.
		const skuTags = getSkuInvalidationTags(
			existingSku.sku,
			updatedProduct.id,
			updatedProduct.slug,
			validatedData.defaultSku.skuId,
			affectedColorSlugs,
			normalizedColorIds,
			affectedMaterialSlugs,
			normalizedMaterialIds,
		);
		skuTags.forEach((tag) => updateTag(tag));

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

		// 11. Delete removed images from UploadThing storage — via la SSOT qui
		// préserve les URLs encore référencées par un snapshot de commande
		// (MEDIA-AUDIT-003) ou par une autre ligne SkuMedia (blobs partagés par
		// duplication). `after()` plutôt que fire-and-forget : en serverless, la
		// lambda peut geler avant la résolution d'une promesse détachée.
		// Recoupement d'appartenance : seules les URLs que le SKU possédait avant
		// la transaction peuvent partir en suppression.
		const ownedDeletedUrls = deletedImageUrls.filter((url) => oldSkuMediaUrls.has(url));
		if (ownedDeletedUrls.length > 0) {
			after(() => deleteUnreferencedCatalogMedia(ownedDeletedUrls, { action: "updateProduct" }));
		}

		// 12. Audit log

		// 13. Success
		return success(`Bijou « ${updatedProduct.title} » peaufiné`, updatedProduct);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le produit");
	}
}

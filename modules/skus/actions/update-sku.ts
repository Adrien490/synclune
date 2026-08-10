"use server";

import * as Sentry from "@sentry/nextjs";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { updateTag } from "next/cache";
import { after } from "next/server";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validationError } from "@/shared/lib/actions";
import { updateProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import { parseMediaFromFormStrict } from "../utils/parse-media-from-form";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";
import { assertPublicProductKeepsActiveSku } from "../services/validate-public-active-sku.service";
import { applyInventoryDeltaTx } from "../services/apply-inventory-delta.service";
import {
	assertColorsExist,
	assertMaterialsExist,
	assertUniqueVariantCombination,
	eurosToCents,
	moveSkuToFront,
	normalizeMediaForPersistence,
	normalizeOptionalRefs,
	optionalEurosToCents,
	toSkuMediaCreatePayload,
} from "../services/persist-sku-helpers.service";
import { getSkuColorsLabel } from "../utils/sku-colors-label";
import { getSkuMaterialsLabel } from "../utils/sku-materials-label";

/**
 * Server Action pour mettre à jour une variante de produit (Product SKU)
 * Compatible avec useActionState de React 19
 */
export async function updateProductSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_UPDATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des données du FormData
		// Parse medias from JSON string (sent as hidden input) — tableau unifié.
		const media = parseMediaFromFormStrict(formData);

		const rawData = {
			skuId: safeFormGet(formData, "skuId"),
			// ⚠️ Valeurs brutes transmises à Zod, PAS `Number(...) || 0`.
			// `Number("abc")` vaut `NaN`, et `NaN || 0` vaut `0` : une saisie illisible
			// devenait donc un stock de 0 accepté silencieusement. Sur `update-sku` c'est
			// pire que cosmétique — combiné à `originalInventory`, ça produit un delta
			// NÉGATIF qui vide le stock. `z.coerce.number()` rejette `NaN`, donc l'admin
			// obtient une vraie erreur de validation sur le champ fautif.
			priceInclTaxEuros: formData.get("priceInclTaxEuros") ?? undefined,
			compareAtPriceEuros: formData.get("compareAtPriceEuros")
				? Number(formData.get("compareAtPriceEuros"))
				: undefined,
			inventory: formData.get("inventory") ?? undefined,
			originalInventory: formData.get("originalInventory")
				? Number(formData.get("originalInventory"))
				: undefined,
			isActive: formData.get("isActive") === "true",
			isDefault: formData.get("isDefault") === "true",
			// Couleurs M2M sérialisées en JSON (1re = principale)
			colorIds: safeFormGetJSON<string[]>(formData, "colorIds") ?? [],
			// Matériaux M2M sérialisés en JSON (1er = principal)
			materialIds: safeFormGetJSON<string[]>(formData, "materialIds") ?? [],
			size: safeFormGet(formData, "size") ?? "",
			media,
		};

		// 4. Validation avec Zod
		const result = updateProductSkuSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return validationError(
				firstError ? `${errorPath}: ${firstError.message}` : "Données invalides.",
			);
		}

		const validatedData = result.data;

		// 5. Normalize FKs + sizes (Zod schema already trimmed + empty → undefined)
		const refs = normalizeOptionalRefs({
			colorIds: validatedData.colorIds,
			materialIds: validatedData.materialIds,
			size: validatedData.size,
		});

		// 6. Convert prices euros → centimes
		const priceInclTaxCents = eurosToCents(validatedData.priceInclTaxEuros);
		const compareAtPriceCents = optionalEurosToCents(validatedData.compareAtPriceEuros);

		// 7. Normalize media for persistence (premier item = principal, position auto)
		const allMedia = normalizeMediaForPersistence(validatedData.media);

		// 8. Update product SKU in transaction
		const { productSku, oldMediaUrls, previousColors, previousMaterials } =
			await prisma.$transaction(
				async (tx) => {
					// Validate SKU exists and get product info.
					// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
					// supprimé, sans chemin de restauration : le muter est toujours une
					// anomalie (même garde que les 5 autres mutateurs SKU).
					const existingSku = await tx.productSku.findUnique({
						where: { id: validatedData.skuId, deletedAt: null },
						select: {
							id: true,
							sku: true,
							isActive: true,
							inventory: true,
							productId: true,
							product: {
								select: {
									id: true,
									title: true,
									slug: true,
									status: true,
									_count: {
										select: {
											skus: { where: { isActive: true, deletedAt: null } },
										},
									},
								},
							},
							colors: {
								select: { colorId: true, color: { select: { slug: true } } },
							},
							materials: {
								select: { materialId: true, material: { select: { slug: true } } },
							},
							images: {
								select: { url: true },
							},
						},
					});

					if (!existingSku) {
						throw new BusinessError("La variante spécifiée n'existe pas.");
					}

					// « Principale » = rang 0 de (position asc, id asc) — remplace le
					// flag `isDefault` (audit schéma V5, lot A2).
					const rankZero = await tx.productSku.findFirst({
						where: { productId: existingSku.productId, deletedAt: null },
						orderBy: [{ position: "asc" }, { id: "asc" }],
						select: { id: true },
					});
					const isRepresentative = rankZero?.id === existingSku.id;

					// Refus de desactiver la variante principale (alignement avec update-sku-status.ts).
					// L'admin doit d'abord promouvoir une autre variante via setDefaultSku.
					if (isRepresentative && existingSku.isActive && !validatedData.isActive) {
						throw new BusinessError(
							"Impossible de désactiver la variante principale. Définissez d'abord une autre variante comme principale.",
						);
					}

					// Refus de retirer le rang 0 sans transfert. L'admin doit utiliser
					// setDefaultSku sur une autre variante (qui renumérote le produit).
					if (isRepresentative && !validatedData.isDefault) {
						throw new BusinessError(
							"Impossible de retirer le statut « principale » sans la transférer. Utilisez « Définir par défaut » sur une autre variante.",
						);
					}

					// Produit PUBLIC: garantir qu'au moins 1 SKU actif reste si on desactive celui-ci
					if (existingSku.isActive && !validatedData.isActive) {
						assertPublicProductKeepsActiveSku({
							productStatus: existingSku.product.status,
							activeTotal: existingSku.product._count.skus,
							activeAffected: 1,
						});
					}

					await assertColorsExist(tx, refs.colorIds);
					await assertMaterialsExist(tx, refs.materialIds);
					await assertUniqueVariantCombination(tx, {
						productId: existingSku.productId,
						colorIds: refs.colorIds,
						size: refs.size,
						excludeSkuId: validatedData.skuId,
					});

					await tx.skuMedia.deleteMany({
						where: { skuId: validatedData.skuId },
					});

					// Verrou ligne + DELTA relatif à la valeur affichée à l'admin, au lieu d'un
					// set absolu last-write-wins. SSOT partagée avec `update-product` (fiche
					// produit, cas mono-SKU) : cf. le docblock d'`applyInventoryDeltaTx` pour le
					// détail de l'anti stock fantôme.
					const inventoryDelta = await applyInventoryDeltaTx(tx, {
						skuId: validatedData.skuId,
						targetInventory: validatedData.inventory,
						originalInventory: validatedData.originalInventory,
						fallbackInventory: existingSku.inventory,
					});

					const updatedSku = await tx.productSku.update({
						where: { id: validatedData.skuId },
						data: {
							priceInclTax: priceInclTaxCents,
							compareAtPrice: compareAtPriceCents,
							inventory: { increment: inventoryDelta },
							isActive: validatedData.isActive,
							size: refs.size,
							colors: {
								deleteMany: {},
								create: refs.colorIds.map((colorId, index) => ({
									colorId,
									position: index,
								})),
							},
							materials: {
								deleteMany: {},
								create: refs.materialIds.map((materialId, index) => ({
									materialId,
									position: index,
								})),
							},
						},
						include: {
							product: { select: { title: true, slug: true } },
							colors: {
								include: { color: { select: { name: true, slug: true } } },
								orderBy: { position: "asc" },
							},
							materials: {
								include: { material: { select: { name: true, slug: true } } },
								orderBy: { position: "asc" },
							},
						},
					});

					if (allMedia.length > 0) {
						await tx.skuMedia.createMany({
							data: toSkuMediaCreatePayload(updatedSku.id, allMedia),
						});
					}

					// « Définir par défaut » = amener au rang 0 (no-op fonctionnel si la
					// variante y est déjà : la renumérotation re-produit le même ordre).
					if (validatedData.isDefault && !isRepresentative) {
						await moveSkuToFront(tx, existingSku.productId, validatedData.skuId);
					}

					return {
						productSku: updatedSku,
						oldMediaUrls: existingSku.images.map((m) => m.url),
						previousColors: existingSku.colors,
						previousMaterials: existingSku.materials,
					};
				},
				// Cette transaction tient advisory lock d'identité de variante + FOR UPDATE sur l'inventaire.
				// Le défaut Prisma (5 s) la faisait échouer en P2028 sous contention avec le
				// webhook d'encaissement, qui verrouille les mêmes lignes avec 30 s — l'admin
				// voyait une erreur générique non déterministe. Prescrit par prisma-tx-options.
				{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
			);

		// 9. Delete removed media from UploadThing storage — via la SSOT qui
		// préserve les URLs encore référencées par un snapshot de commande
		// (MEDIA-AUDIT-003 : figé 10 ans, rendu dans le PDF de facture) ou par une
		// autre ligne SkuMedia (blobs partagés par duplication). Ce chemin
		// supprimait sans aucune vérif, seul divergent des trois écrivains.
		// `after()` plutôt que fire-and-forget : en serverless, la lambda peut
		// geler avant la résolution d'une promesse détachée.
		const newMediaUrls = new Set(allMedia.map((m) => m.url));
		const removedUrls = oldMediaUrls.filter((url) => !newMediaUrls.has(url));
		if (removedUrls.length > 0) {
			after(() => deleteUnreferencedCatalogMedia(removedUrls, { action: "updateProductSku" }));
		}

		// 10. Build success message
		const variantDetails = [
			getSkuColorsLabel(productSku.colors),
			getSkuMaterialsLabel(productSku.materials),
			productSku.size,
		]
			.filter(Boolean)
			.join(" - ");

		const successMessage = variantDetails
			? `Variante "${variantDetails}" mise à jour avec succès.`
			: `Variante mise à jour avec succès.`;

		// 11. Invalidate cache (immediate visibility for admin)
		// Couleurs/matériaux touchés = union (avant ∪ après) — le `_count.skuColors`
		// d'une couleur retirée ET d'une couleur ajoutée doit se rafraîchir.
		const touchedColorIds = new Set<string>([
			...previousColors.map((c) => c.colorId),
			...productSku.colors.map((c) => c.colorId),
		]);
		const touchedColorSlugs = new Set<string>([
			...previousColors.map((c) => c.color.slug),
			...productSku.colors.map((c) => c.color.slug),
		]);
		const touchedMaterialSlugs = new Set<string>([
			...previousMaterials.map((m) => m.material.slug),
			...productSku.materials.map((m) => m.material.slug),
		]);
		const touchedMaterialIds = new Set<string>([
			...previousMaterials.map((m) => m.materialId),
			...productSku.materials.map((m) => m.materialId),
		]);

		const tags = getSkuInvalidationTags(
			productSku.sku,
			productSku.productId,
			productSku.product.slug,
			productSku.id, // Invalide aussi le cache stock temps réel
			Array.from(touchedColorSlugs),
			Array.from(touchedColorIds),
			Array.from(touchedMaterialSlugs),
			Array.from(touchedMaterialIds),
		);
		tags.forEach((tag) => updateTag(tag));

		// 12. Audit log

		// 13. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				id: productSku.id,
				sku: productSku.sku,
				productId: productSku.productId,
				productSlug: productSku.product.slug,
			},
		};
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			Sentry.captureMessage("SKU code collision (P2002) on updateProductSku", {
				level: "warning",
				tags: { action: "updateProductSku", code: "P2002" },
				extra: { target: e.meta?.target },
			});
			return {
				status: ActionStatus.ERROR,
				message: "Une variante avec ce code existe déjà.",
			};
		}
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour de la variante.");
	}
}

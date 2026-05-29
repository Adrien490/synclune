"use server";

import * as Sentry from "@sentry/nextjs";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_UPDATE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
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
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { logger } from "@/shared/lib/logger";
import { notifyBackInStock } from "@/modules/wishlist/services/notify-back-in-stock";
import { assertPublicProductKeepsActiveSku } from "../services/validate-public-active-sku.service";
import {
	assertColorsExist,
	assertMaterialsExist,
	assertUniqueVariantCombination,
	eurosToCents,
	normalizeMediaForPersistence,
	normalizeOptionalRefs,
	optionalEurosToCents,
	toSkuMediaCreatePayload,
	unsetOtherDefaultSkus,
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
			priceInclTaxEuros: Number(formData.get("priceInclTaxEuros")) || 0,
			compareAtPriceEuros: formData.get("compareAtPriceEuros")
				? Number(formData.get("compareAtPriceEuros"))
				: undefined,
			inventory: Number(formData.get("inventory")) || 0,
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

		// 7. Normalize media for persistence (premier item = principal, isPrimary/position auto)
		const allMedia = normalizeMediaForPersistence(validatedData.media);

		// 8. Update product SKU in transaction
		const {
			productSku,
			oldMediaUrls,
			previousInventory,
			previousIsActive,
			previousColors,
			previousMaterials,
		} = await prisma.$transaction(async (tx) => {
			// Validate SKU exists and get product info
			const existingSku = await tx.productSku.findUnique({
				where: { id: validatedData.skuId },
				select: {
					id: true,
					sku: true,
					isActive: true,
					isDefault: true,
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

			// Refus de desactiver la variante principale (alignement avec update-sku-status.ts).
			// L'admin doit d'abord promouvoir une autre variante via setDefaultSku.
			if (existingSku.isDefault && existingSku.isActive && !validatedData.isActive) {
				throw new BusinessError(
					"Impossible de désactiver la variante principale. Définissez d'abord une autre variante comme principale.",
				);
			}

			// Refus de retirer isDefault sans transfert. L'admin doit utiliser
			// setDefaultSku sur une autre variante (qui re-set isDefault=false ici via
			// unsetOtherDefaultSkus de l'action setDefaultSku).
			if (existingSku.isDefault && !validatedData.isDefault) {
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

			if (validatedData.isDefault) {
				await unsetOtherDefaultSkus(tx, existingSku.productId, validatedData.skuId);
			}

			await tx.skuMedia.deleteMany({
				where: { skuId: validatedData.skuId },
			});

			const updatedSku = await tx.productSku.update({
				where: { id: validatedData.skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
					inventory: validatedData.inventory,
					isActive: validatedData.isActive,
					isDefault: validatedData.isDefault,
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

			return {
				productSku: updatedSku,
				oldMediaUrls: existingSku.images.map((m) => m.url),
				previousInventory: existingSku.inventory,
				previousIsActive: existingSku.isActive,
				previousColors: existingSku.colors,
				previousMaterials: existingSku.materials,
			};
		});

		// 9. Delete removed media from UploadThing storage
		const newMediaUrls = new Set(allMedia.map((m) => m.url));
		const removedUrls = oldMediaUrls.filter((url) => !newMediaUrls.has(url));
		if (removedUrls.length > 0) {
			deleteUploadThingFilesFromUrls(removedUrls).catch((e) => {
				logger.error("Failed to delete UploadThing files", e, { action: "updateProductSku" });
			});
		}

		// 9.b Back-in-stock notifications (background, survives the response via
		// `after()`): trigger when transitioning from unavailable (out of stock OR
		// inactive) to available (inventory > 0 AND active). Le throttle interne
		// (NOTIFY_SEND_INTERVAL_MS) rallonge le travail ; `after()` évite qu'il soit
		// tué par le freeze serverless. Idempotent via wishlist.backInStockNotifiedAt.
		const wasUnavailable = previousInventory === 0 || !previousIsActive;
		const isNowAvailable = validatedData.inventory > 0 && validatedData.isActive;
		if (wasUnavailable && isNowAvailable) {
			after(() => notifyBackInStock(productSku.productId));
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

		const tags = getSkuInvalidationTags(
			productSku.sku,
			productSku.productId,
			productSku.product.slug,
			productSku.id, // Invalide aussi le cache stock temps réel
			Array.from(touchedColorSlugs),
			Array.from(touchedColorIds),
			Array.from(touchedMaterialSlugs),
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

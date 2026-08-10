import { z } from "zod";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import type {
	SkuDetailsResult,
	BatchSkuValidationResult,
} from "@/modules/cart/types/sku-validation.types";
import { getSkuDetailsSchema } from "@/modules/cart/schemas/cart.schemas";
import {
	fetchSkuForValidation,
	fetchSkusForBatchValidation,
} from "@/modules/cart/data/get-sku-for-validation";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";

type FetchedSku = Awaited<ReturnType<typeof fetchSkuForValidation>>;

function buildSkuDetailsSuccess(sku: NonNullable<FetchedSku>): SkuDetailsResult {
	return {
		success: true,
		data: {
			sku: {
				id: sku.id,
				sku: sku.sku,
				priceInclTax: sku.priceInclTax,
				compareAtPrice: sku.compareAtPrice,
				isActive: sku.isActive,
				material: getSkuMaterialsLabel(sku.materials) ?? undefined,
				colors: sku.colors.map((c) => ({
					id: c.color.id,
					name: c.color.name,
					hex: c.color.hex,
				})),
				size: sku.size ?? undefined,
				product: {
					id: sku.product.id,
					title: sku.product.title,
					slug: sku.product.slug,
					description: sku.product.description ?? null,
				},
				images: sku.images.map((img) => ({
					url: img.url,
					altText: img.altText ?? undefined,
					mediaType: img.mediaType,
				})),
			},
		},
	};
}

function checkSkuDetailsErrors(sku: NonNullable<FetchedSku>): SkuDetailsResult | null {
	if (sku.deletedAt || sku.product.deletedAt) {
		return { success: false, error: CART_ERROR_MESSAGES.PRODUCT_DELETED };
	}
	if (!sku.isActive) {
		return { success: false, error: CART_ERROR_MESSAGES.SKU_INACTIVE };
	}
	if (sku.product.status !== "PUBLIC") {
		return { success: false, error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC };
	}
	return null;
}

// Action: Récupérer les détails complets d'un SKU pour l'affichage
export async function getSkuDetails(input: { skuId: string }): Promise<SkuDetailsResult> {
	try {
		const validatedInput = getSkuDetailsSchema.parse(input);

		const sku = await fetchSkuForValidation(validatedInput.skuId);

		if (!sku) {
			return { success: false, error: CART_ERROR_MESSAGES.SKU_NOT_FOUND };
		}

		const guardError = checkSkuDetailsErrors(sku);
		if (guardError) return guardError;

		return buildSkuDetailsSuccess(sku);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.issues[0]?.message ?? CART_ERROR_MESSAGES.INVALID_DATA,
			};
		}

		return {
			success: false,
			error: CART_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}

/**
 * Valide un panier complet (disponibilité + quantité vs stock) en UNE requête DB.
 *
 * Appelants : `initializePayment` et `updatePaymentAmount` (CHECKOUT-STOCK-GATE-001).
 * C'est la seule fonction de ce fichier qui compare `inventory` à une quantité —
 * `getSkuDetails` ne reçoit pas de quantité et ne lit jamais le stock.
 *
 * ⚠️ Garde de COURTOISIE, pas garde anti-survente : la lecture passe par
 * `fetchSkusForBatchValidation` (`"use cache"`, profil `checkout`, jusqu'à 5 min de
 * péremption) et ne tient aucun verrou. Son rôle est d'échouer tôt et avec le bon
 * message, avant la création du PaymentIntent. L'arbitrage réel de la vente reste le
 * `SELECT … FOR UPDATE` de `order-creation.service.ts` puis le décrément du webhook.
 *
 * Historique : cette fonction est restée entièrement écrite et testée mais sans
 * aucun appelant jusqu'à l'audit « validation stock panier » du 2026-07-30, pendant
 * que le checkout validait tout SAUF le stock. Sa jumelle mono-SKU
 * (`validateSkuAndStock`) a été supprimée à cette occasion — même dormance, aucun
 * usage possible ici où les paniers sont toujours validés en lot.
 */
export async function validateCartItemsWithDb(input: {
	items: Array<{
		skuId: string;
		quantity: number;
	}>;
}): Promise<{
	success: boolean;
	error?: string;
	data?: Array<{
		skuId: string;
		isValid: boolean;
		error?: string;
	}>;
}> {
	try {
		// Single batch query for all SKUs
		const batchResults = await batchValidateSkusForMerge(input.items);

		const validationResults = input.items.map((item) => {
			const result = batchResults.get(item.skuId);

			if (!result) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.SKU_NOT_FOUND,
				};
			}

			if (!result.isActive) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.SKU_INACTIVE,
				};
			}

			if (result.productStatus !== "PUBLIC") {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
				};
			}

			if (result.inventory === 0) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.OUT_OF_STOCK,
				};
			}

			if (result.inventory < item.quantity) {
				return {
					skuId: item.skuId,
					isValid: false,
					error: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK,
				};
			}

			return {
				skuId: item.skuId,
				isValid: true,
			};
		});

		const hasErrors = validationResults.some((result) => !result.isValid);

		return {
			success: !hasErrors,
			error: hasErrors ? CART_ERROR_MESSAGES.VALIDATION_FAILED : undefined,
			data: validationResults,
		};
	} catch (_error) {
		return {
			success: false,
			error: CART_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}

/**
 * Valide plusieurs SKUs en une seule requête DB (optimisé pour mergeCarts)
 * Retourne une Map pour un accès O(1) aux résultats
 */
export async function batchValidateSkusForMerge(
	items: Array<{ skuId: string; quantity: number }>,
): Promise<Map<string, BatchSkuValidationResult>> {
	const skuIds = items.map((item) => item.skuId);
	const quantityMap = new Map(items.map((item) => [item.skuId, item.quantity]));

	const skus = await fetchSkusForBatchValidation(skuIds);

	const results = new Map<string, BatchSkuValidationResult>();

	for (const sku of skus) {
		const requestedQty = quantityMap.get(sku.id) ?? 0;
		// Verifier aussi les soft-deletes pour eviter d'ajouter des produits supprimes
		const isValid =
			!sku.deletedAt &&
			!sku.product.deletedAt &&
			sku.isActive &&
			sku.product.status === "PUBLIC" &&
			sku.inventory >= requestedQty;

		results.set(sku.id, {
			skuId: sku.id,
			isValid,
			inventory: sku.inventory,
			isActive: sku.isActive,
			productStatus: sku.product.status,
		});
	}

	return results;
}

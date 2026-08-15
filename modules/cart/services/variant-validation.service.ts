import { z } from "zod";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import type {
	VariantDetailsResult,
	BatchVariantValidationResult,
} from "@/modules/cart/types/variant-validation.types";
import { getVariantDetailsSchema } from "@/modules/cart/schemas/cart.schemas";
import {
	fetchVariantForValidation,
	fetchVariantsForBatchValidation,
} from "@/modules/cart/data/get-variant-for-validation";
type FetchedVariant = Awaited<ReturnType<typeof fetchVariantForValidation>>;

function buildVariantDetailsSuccess(variant: NonNullable<FetchedVariant>): VariantDetailsResult {
	return {
		success: true,
		data: {
			variant: {
				id: variant.id,
				priceCents: variant.priceCents ?? variant.product.priceCents,
				active: variant.active,
				material: variant.material?.name ?? undefined,
				colors: variant.color
					? [{ id: variant.color.id, name: variant.color.name, hex: variant.color.hex }]
					: [],
				size: variant.size ?? undefined,
				product: {
					id: variant.product.id,
					name: variant.product.name,
					slug: variant.product.slug,
					description: variant.product.description,
				},
				images: variant.product.media.map((img) => ({
					url: img.url,
					alt: img.alt ?? undefined,
					type: img.type,
				})),
			},
		},
	};
}

function checkVariantDetailsErrors(
	variant: NonNullable<FetchedVariant>,
): VariantDetailsResult | null {
	if (!variant.active) {
		return { success: false, error: CART_ERROR_MESSAGES.VARIANT_INACTIVE };
	}
	if (!variant.product.active) {
		return { success: false, error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC };
	}
	return null;
}

// Action: Récupérer les détails complets d'un VARIANT pour l'affichage
export async function getVariantDetails(input: {
	variantId: string;
}): Promise<VariantDetailsResult> {
	try {
		const validatedInput = getVariantDetailsSchema.parse(input);

		const variant = await fetchVariantForValidation(validatedInput.variantId);

		if (!variant) {
			return { success: false, error: CART_ERROR_MESSAGES.VARIANT_NOT_FOUND };
		}

		const guardError = checkVariantDetailsErrors(variant);
		if (guardError) return guardError;

		return buildVariantDetailsSuccess(variant);
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
 * C'est la seule fonction de ce fichier qui compare `stock` à une quantité —
 * `getVariantDetails` ne reçoit pas de quantité et ne lit jamais le stock.
 *
 * ⚠️ Garde de COURTOISIE, pas garde anti-survente : la lecture passe par
 * `fetchVariantsForBatchValidation` (`"use cache"`, profil `checkout`, jusqu'à 5 min de
 * péremption) et ne tient aucun verrou. Son rôle est d'échouer tôt et avec le bon
 * message, avant la création du PaymentIntent. L'arbitrage réel de la vente reste le
 * `SELECT … FOR UPDATE` de `order-creation.service.ts` puis le décrément du webhook.
 *
 * Historique : cette fonction est restée entièrement écrite et testée mais sans
 * aucun appelant jusqu'à l'audit « validation stock panier » du 2026-07-30, pendant
 * que le checkout validait tout SAUF le stock. Sa jumelle mono-VARIANT
 * (`validateVariantAndStock`) a été supprimée à cette occasion — même dormance, aucun
 * usage possible ici où les paniers sont toujours validés en lot.
 */
export async function validateCartItemsWithDb(input: {
	items: Array<{
		variantId: string;
		quantity: number;
	}>;
}): Promise<{
	success: boolean;
	error?: string;
	data?: Array<{
		variantId: string;
		isValid: boolean;
		error?: string;
	}>;
}> {
	try {
		// Single batch query for all VARIANTs
		const batchResults = await batchValidateVariantsForMerge(input.items);

		const validationResults = input.items.map((item) => {
			const result = batchResults.get(item.variantId);

			if (!result) {
				return {
					variantId: item.variantId,
					isValid: false,
					error: CART_ERROR_MESSAGES.VARIANT_NOT_FOUND,
				};
			}

			if (!result.active) {
				return {
					variantId: item.variantId,
					isValid: false,
					error: CART_ERROR_MESSAGES.VARIANT_INACTIVE,
				};
			}

			if (!result.productActive) {
				return {
					variantId: item.variantId,
					isValid: false,
					error: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
				};
			}

			if (result.stock === 0) {
				return {
					variantId: item.variantId,
					isValid: false,
					error: CART_ERROR_MESSAGES.OUT_OF_STOCK,
				};
			}

			if (result.stock < item.quantity) {
				return {
					variantId: item.variantId,
					isValid: false,
					error: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK,
				};
			}

			return {
				variantId: item.variantId,
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
 * Valide plusieurs VARIANTs en une seule requête DB (optimisé pour mergeCarts)
 * Retourne une Map pour un accès O(1) aux résultats
 */
export async function batchValidateVariantsForMerge(
	items: Array<{ variantId: string; quantity: number }>,
): Promise<Map<string, BatchVariantValidationResult>> {
	const variantIds = items.map((item) => item.variantId);
	const quantityMap = new Map(items.map((item) => [item.variantId, item.quantity]));

	const variants = await fetchVariantsForBatchValidation(variantIds);

	const results = new Map<string, BatchVariantValidationResult>();

	for (const variant of variants) {
		const requestedQty = quantityMap.get(variant.id) ?? 0;
		const isValid = variant.active && variant.product.active && variant.stock >= requestedQty;

		results.set(variant.id, {
			variantId: variant.id,
			isValid,
			stock: variant.stock,
			active: variant.active,
			productActive: variant.product.active,
		});
	}

	return results;
}

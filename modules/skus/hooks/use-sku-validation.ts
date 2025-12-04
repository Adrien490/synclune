import { extractVariantInfo } from "@/modules/skus/services/extract-sku-info";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { useMemo } from "react";

interface VariantSelection {
	color: string | null;
	material: string | null;
	size: string | null;
}

interface UseVariantValidationOptions {
	product: GetProductReturn;
	selection: VariantSelection;
}

export interface UseVariantValidationReturn {
	validationErrors: string[];
	isValid: boolean;
	requiresColor: boolean;
	requiresMaterial: boolean;
	requiresSize: boolean;
}

/**
 * Hook pour valider la sélection des variantes produit
 * - Vérifie que toutes les variantes requises sont sélectionnées
 * - Retourne une liste d'erreurs humainement lisibles
 * - Indique quelles variantes sont obligatoires
 */
export function useVariantValidation({
	product,
	selection,
}: UseVariantValidationOptions): UseVariantValidationReturn {
	const variantInfo = extractVariantInfo(product);

	// Déterminer quelles variantes sont requises
	const requiresColor =
		product.skus &&
		product.skus.length > 1 &&
		variantInfo.availableColors.length > 1;

	const requiresMaterial =
		product.skus &&
		product.skus.length > 1 &&
		variantInfo.availableMaterials.length > 1;

	const hasAdjustableSizes = variantInfo.availableSizes.some((s) =>
		s.size.toLowerCase().includes("ajustable")
	);

	const requiresSize =
		product.skus &&
		product.skus.length > 1 &&
		!hasAdjustableSizes &&
		variantInfo.availableSizes.length > 0 &&
		PRODUCT_TYPES_REQUIRING_SIZE.includes(
			product.type?.slug as (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number]
		);

	// Calculer les erreurs de validation
	const validationErrors = useMemo(() => {
		const errors: string[] = [];

		if (requiresColor && !selection.color) {
			errors.push("Veuillez sélectionner une couleur");
		}

		if (requiresMaterial && !selection.material) {
			errors.push("Veuillez sélectionner un matériau");
		}

		if (requiresSize && !selection.size) {
			errors.push("Veuillez sélectionner une taille");
		}

		return errors;
	}, [requiresColor, requiresMaterial, requiresSize, selection]);

	const isValid = validationErrors.length === 0;

	return {
		validationErrors,
		isValid,
		requiresColor,
		requiresMaterial,
		requiresSize,
	};
}

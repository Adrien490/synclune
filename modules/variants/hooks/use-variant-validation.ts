import {
	extractVariantInfo,
	requiresSizeSelection,
} from "@/modules/variants/services/variant-info-extraction.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { VariantSelection, UseVariantValidationReturn } from "../types/variant.types";

interface UseVariantValidationOptions {
	product: GetProductReturn;
	selection: VariantSelection;
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
	const requiresColor = product.variants.length > 1 && variantInfo.availableColors.length > 1;

	const requiresMaterial = product.variants.length > 1 && variantInfo.availableMaterials.length > 1;

	// SSOT du prédicat : le squelette de la colonne d'achat le lit AUSSI, côté
	// serveur, pour ne pas réserver un axe qui ne sera pas rendu.
	const requiresSize = requiresSizeSelection(product, variantInfo);

	// Calculer les erreurs de validation
	const validationErrors = (() => {
		const errors: string[] = [];

		// Tutoiement : ces messages partent dans la live region du sélecteur
		// (`variant-selector.tsx`), donc ils sont LUS à un utilisateur de lecteur
		// d'écran — sur une page dont tout le reste tutoie (CLAUDE.md § Voix).
		if (requiresColor && !selection.color) {
			errors.push("Choisis une couleur");
		}

		if (requiresMaterial && !selection.material) {
			errors.push("Choisis un matériau");
		}

		if (requiresSize && !selection.size) {
			errors.push("Choisis une taille");
		}

		return errors;
	})();

	const isValid = validationErrors.length === 0;

	return {
		validationErrors,
		isValid,
		requiresColor,
		requiresMaterial,
		requiresSize,
	};
}

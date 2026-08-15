// ============================================================================
// TYPES - VARIANT VALIDATION
// ============================================================================

/**
 * Donnees completes d'un VARIANT pour l'affichage et la validation
 */
interface VariantData {
	id: string;
	/** Prix effectif (override variante, sinon prix produit) en centimes TTC. */
	priceCents: number;
	active: boolean;
	material?: string;
	/** 0 ou 1 couleur (FK simple depuis le schéma lean). */
	colors: Array<{
		id: string;
		name: string;
		hex: string | null;
	}>;
	size?: string;
	product: {
		id: string;
		name: string;
		slug: string;
		description?: string | null;
	};
	/** Médias du PRODUIT, pré-triés (position asc, id asc) — 1re IMAGE = principale. */
	images: Array<{
		url: string;
		alt?: string;
		type: "IMAGE" | "VIDEO";
	}>;
}

/**
 * Resultat de la recuperation des details d'un VARIANT
 */
export interface VariantDetailsResult {
	success: boolean;
	error?: string;
	data?: {
		variant: VariantData;
	};
}

/**
 * Resultat de validation batch pour un VARIANT (utilise par mergeCarts)
 */
export interface BatchVariantValidationResult {
	variantId: string;
	isValid: boolean;
	stock: number;
	active: boolean;
	productActive: boolean;
}

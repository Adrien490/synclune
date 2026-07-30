// ============================================================================
// TYPES - SKU VALIDATION
// ============================================================================

/**
 * Donnees completes d'un SKU pour l'affichage et la validation
 */
interface SkuData {
	id: string;
	sku: string;
	priceInclTax: number;
	compareAtPrice: number | null; // Prix barre (null si pas en solde)
	isActive: boolean;
	material?: string;
	/** Couleurs M2M ordonnées (1re = principale). Vide = aucune couleur renseignée. */
	colors: Array<{
		id: string;
		name: string;
		hex: string;
	}>;
	size?: string;
	product: {
		id: string;
		title: string;
		slug: string;
		description?: string | null;
	};
	images: Array<{
		url: string;
		altText?: string;
		isPrimary: boolean;
		// EINV-SNAPSHOT-MEDIA-001 : requis pour que le consommateur du snapshot de
		// commande puisse écarter une vidéo (`pickPrimaryImage`).
		mediaType: "IMAGE" | "VIDEO";
	}>;
}

/**
 * Resultat de la recuperation des details d'un SKU
 */
export interface SkuDetailsResult {
	success: boolean;
	error?: string;
	data?: {
		sku: SkuData;
	};
}

/**
 * Resultat de validation batch pour un SKU (utilise par mergeCarts)
 */
export interface BatchSkuValidationResult {
	skuId: string;
	isValid: boolean;
	inventory: number;
	isActive: boolean;
	productStatus: string;
}

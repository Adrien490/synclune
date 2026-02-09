// ============================================================================
// TYPES - SKU VALIDATION
// ============================================================================

/**
 * Donnees completes d'un SKU pour l'affichage et la validation
 */
export interface SkuData {
	id: string;
	sku: string;
	priceInclTax: number;
	compareAtPrice: number | null; // Prix barre (null si pas en solde)
	inventory: number;
	isActive: boolean;
	material?: string;
	colorId?: string;
	color?: {
		id: string;
		name: string;
		hex: string;
	};
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
	}>;
}

/**
 * Resultat de la validation d'un SKU avec son stock
 */
export interface SkuValidationResult {
	success: boolean;
	error?: string;
	data?: {
		sku: SkuData;
	};
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


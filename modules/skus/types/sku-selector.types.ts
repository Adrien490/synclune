/**
 * Types partagés pour les composants de sélection de variants
 */

export interface Color {
	id: string;
	slug?: string;
	name: string;
	hex?: string;
	availableSkus?: number;
}

export interface Material {
	name: string;
	availableSkus?: number;
}

export interface Size {
	size: string;
	availableSkus?: number;
}

export interface VariantSelectionProps {
	isPending: boolean;
	isOptionAvailable: (type: string, value: string) => boolean;
}

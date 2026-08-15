/**
 * Types partagés pour les composants de sélection de variants
 */

export interface Color {
	id: string;
	slug?: string;
	name: string;
	hex?: string;
	availableVariants?: number;
}

export interface Material {
	name: string;
	availableVariants?: number;
}

export interface Size {
	size: string;
	availableVariants?: number;
}

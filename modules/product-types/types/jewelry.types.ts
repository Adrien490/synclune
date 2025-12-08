/**
 * Types pour les configurations de bijoux
 */

// ============================================================================
// JEWELRY TYPE CONFIG
// ============================================================================

export interface JewelrySubType {
	key: string;
	label: string;
	href: string;
}

export interface JewelryTypeConfig {
	key: string;
	label: string;
	description: string;
	image: string;
	icon: string;
	href: string;
	subTypes?: JewelrySubType[];
}

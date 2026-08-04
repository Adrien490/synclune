import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS - RECENT ORDERS
// ============================================================================

export const GET_DASHBOARD_RECENT_ORDERS_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
	total: true,
	// Colonnes SNAPSHOT, pas la relation `user` : celle-ci était toujours NULL en
	// achat invité (100 % des commandes), si bien que la liste affichait « Invité »
	// et un email vide pour TOUTES les lignes. `Order.customerName`/`customerEmail`
	// sont obligatoires et figés au checkout. La relation est partie avec
	// `Order.userId` le 2026-08-05.
	customerName: true,
	customerEmail: true,
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DASHBOARD_RECENT_ORDERS_LIMIT = 5;

// LOW_VOLUME_THRESHOLD est parti au Lot 4 S3.5 (2026-08-03) avec les
// évolutions « vs période précédente » qu'il gardait.

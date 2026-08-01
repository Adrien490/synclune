/**
 * Ré-export de la SSOT `modules/orders/constants/status-display.ts`.
 *
 * Ce fichier redéclarait ses propres maps : `UNFULFILLED` s'affichait
 * « À préparer » (badge warning) sur le dashboard et « Non traitée » (badge
 * outline) sur la liste commandes — deux vérités co-visibles en admin.
 * Audit UI design system 2026-08-01.
 */
export {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";

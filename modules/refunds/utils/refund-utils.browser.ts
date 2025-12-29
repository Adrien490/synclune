/**
 * @deprecated Importer depuis @/modules/refunds/services/refund-restock.service
 *
 * Version browser conservée pour rétrocompatibilité
 */

import { RefundReason } from "@/app/generated/prisma/browser";

/**
 * Détermine si le stock doit être restauré selon le motif du remboursement
 *
 * - CUSTOMER_REQUEST : Article retourné par le client → restock
 * - WRONG_ITEM : Erreur de préparation, article récupéré → restock
 * - DEFECTIVE : Article cassé/défectueux → pas de restock
 * - LOST_IN_TRANSIT : Colis perdu → pas de restock
 * - FRAUD : Fraude → pas de restock
 * - OTHER : Autre → pas de restock (par précaution)
 */
export function shouldRestockByDefault(reason: RefundReason): boolean {
	return (
		reason === RefundReason.CUSTOMER_REQUEST ||
		reason === RefundReason.WRONG_ITEM
	);
}

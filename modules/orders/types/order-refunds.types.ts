/**
 * Types pour les remboursements de commandes
 */

export interface OrderRefundItem {
	id: string;
	amount: number;
	status: string;
	reason: string;
	createdAt: Date;
}

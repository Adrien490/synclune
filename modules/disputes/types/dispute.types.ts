import type { Dispute, DisputeStatus, CurrencyCode } from "@/app/generated/prisma";

/**
 * Dispute avec order résumé (pour liste admin)
 */
export interface DisputeWithOrder extends Dispute {
	order: {
		orderNumber: string;
		customerEmail: string;
		customerName: string;
	};
}

/**
 * Statistiques des disputes
 */
export interface DisputeStats {
	total: number;
	needsResponse: number;
	underReview: number;
	won: number;
	lost: number;
	totalAmountDisputed: number;
	totalAmountLost: number;
}

/**
 * Filtres pour la liste des disputes
 */
export interface DisputeFilters {
	status?: DisputeStatus;
	orderId?: string;
}

export type { Dispute, DisputeStatus, CurrencyCode };

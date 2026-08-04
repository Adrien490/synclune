import { type OrderStatus, type PaymentStatus } from "@/app/generated/prisma/client";

// ============================================================================
// TYPES - SERVICE INPUTS (from services/)
// ============================================================================

export interface OrderForTransform {
	id: string;
	orderNumber: string;
	createdAt: Date;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	total: number;
	customerName: string;
	customerEmail: string;
}

// ============================================================================
// TYPES - KPIs
// ============================================================================

export type GetKpisReturn = {
	// Lot 4 S3.5 (2026-08-03) : mois en cours uniquement — plus d'évolutions
	// « vs période précédente », de sparklines ni de délai moyen d'expédition
	// (les courbes vivent dans le dashboard Stripe).
	monthlyRevenue: {
		amount: number;
		netAmount: number;
		refundAmount: number;
		refundCount: number;
		/** Pourcentage de commandes payées remboursées sur le mois en cours */
		refundRate: number;
	};
	monthlyOrders: {
		count: number;
	};
	averageOrderValue: {
		amount: number;
	};
	conversionRate: {
		rate: number;
		abandoned: number;
	};
	pendingShipment: {
		count: number;
	};
	/**
	 * Nouveaux clients : clients dont la 1ʳᵉ commande payée tombe dans le mois
	 * (clé client = COALESCE userId, customerEmail).
	 */
	newCustomers: {
		count: number;
	};
};

// ============================================================================
// TYPES - VAT THRESHOLD (franchise en base art. 293 B CGI)
// ============================================================================

export type GetVatProgressReturn = {
	/** Cumul du chiffre d'affaires payé depuis le 1er janvier de l'année en cours */
	ytdRevenue: number;
	/** Seuil de franchise de base — défaut 85 000 € (ventes de biens, cas Synclune ; 37 500 € prestations de services) */
	threshold: number;
	/** Seuil majoré (base × 1,1) — au-delà, la TVA est due dès le 1er du mois de dépassement */
	majoredThreshold: number;
	/** Pourcentage du seuil DE BASE atteint (0–100+) */
	progress: number;
	/** Année courante (utile pour libellé UI) */
	year: number;
};

// ============================================================================
// TYPES - PERIOD BOUNDARIES
// ============================================================================

export type PeriodBoundaries = {
	currentStart: Date;
	currentEnd: Date;
	previousStart: Date;
	previousEnd: Date;
	/** Same period one year earlier - used for Year-over-Year comparisons */
	previousYearStart: Date;
	previousYearEnd: Date;
};

// ============================================================================
// TYPES - RECENT ORDERS
// ============================================================================

export type RecentOrderItem = {
	id: string;
	orderNumber: string;
	createdAt: Date;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	total: number;
	customerName: string;
	customerEmail: string;
};

export type GetRecentOrdersReturn = {
	orders: RecentOrderItem[];
};

// ============================================================================
// TYPES - ALERTS
// ============================================================================

export type DashboardAlerts = {
	/** Remboursements à rattraper : FAILED, ou COMPLETED sans avoir sur commande facturée (Lot 2 S3.3). */
	refundsNeedingAttention: number;
};

/**
 * Compteurs « à traiter » du dashboard (audit right-sizing §4.2).
 * Remplacent les crons d'alerte retirés (overbilled-orders / stuck-orders) : un coup
 * d'œil read-only à la connexion au lieu d'e-mails quotidiens.
 *
 * Pas de compteur de litiges : le modèle `Dispute` a été retiré en V1 (2026-07-30),
 * les deadlines de chargeback se suivent dans le Dashboard Stripe.
 *
 * Pas de compteur de sur-facturation non plus (audit du module orders,
 * 2026-08-05) : il ne pouvait s'éteindre qu'en cliquant un bouton de maintenance,
 * et son lien menait à la liste NON filtrée — il ne disait pas quelle commande.
 * La détection subsiste, mais elle prévient par e-mail d'alerte admin.
 */
export type DashboardActionItems = {
	/** Commandes PAID en PROCESSING depuis plus de 7 jours. */
	stuckProcessing: number;
	/** Commandes SHIPPED depuis plus de 14 jours sans livraison confirmée. */
	stuckShipped: number;
	/** Commandes PAID sans numéro de facture depuis plus de 7 jours. */
	stuckInvoices: number;
	/** Paiements PENDING avec PaymentIntent orphelin depuis plus de 14 jours. */
	orphanPending: number;
};

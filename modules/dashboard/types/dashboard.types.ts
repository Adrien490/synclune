import {
	type FulfillmentStatus,
	type OrderStatus,
	type PaymentStatus,
} from "@/app/generated/prisma/client";

// ============================================================================
// TYPES - SERVICE INPUTS (from services/)
// ============================================================================

export interface OrderForTransform {
	id: string;
	orderNumber: string;
	createdAt: Date;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	total: number;
	user: {
		name: string | null;
		email: string;
	} | null;
}

// ============================================================================
// TYPES - KPIs
// ============================================================================

export type GetKpisReturn = {
	monthlyRevenue: {
		amount: number;
		netAmount: number;
		refundAmount: number;
		refundCount: number;
		/** Pourcentage de commandes payées remboursées sur la période courante */
		refundRate: number;
		evolution: number;
		/** Order count of the previous comparison period — used to gate evolution display when volume is too low to be meaningful */
		previousVolume: number;
	};
	monthlyOrders: {
		count: number;
		evolution: number;
		previousVolume: number;
	};
	averageOrderValue: {
		amount: number;
		evolution: number;
		previousVolume: number;
	};
	conversionRate: {
		rate: number;
		evolution: number;
		abandoned: number;
		/** Total orders (paid + abandoned) of the previous period — denominator volume */
		previousVolume: number;
	};
	pendingShipment: {
		count: number;
	};
	discountImpact: {
		amount: number;
		evolution: number;
		previousVolume: number;
	};
	avgFulfillmentTime: {
		hours: number;
		evolution: number;
		previousVolume: number;
	};
	/**
	 * Nouveaux clients : clients dont la 1ʳᵉ commande payée tombe dans la période
	 * (clé client = COALESCE userId, customerEmail). Évolution vs période de comparaison.
	 */
	newCustomers: {
		count: number;
		evolution: number;
		previousVolume: number;
	};
	/**
	 * Compact daily series (current period, Paris wall-clock) feeding the
	 * KpiCard background sparkline. Empty arrays when no data.
	 */
	sparklines: {
		revenue: number[];
		orders: number[];
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
// TYPES - REVENUE CHART (RAW SQL)
// ============================================================================

export type RevenueRow = {
	date: string;
	revenue: bigint;
	orders: bigint;
	subtotal: bigint;
	discounts: bigint;
	shipping: bigint;
};

// ============================================================================
// TYPES - REVENUE CHART
// ============================================================================

export type RevenueDataPoint = {
	date: string;
	revenue: number;
	orders: number;
	subtotal: number;
	discounts: number;
	shipping: number;
	/**
	 * Revenue of the comparison period (previous / YoY) aligned by ordinal bucket
	 * index. Present on every point only when comparison data exists.
	 */
	previousRevenue?: number;
};

export type GetRevenueChartReturn = {
	data: RevenueDataPoint[];
	periodLabel: string;
	/** Bucket granularity — drives accurate sr-only copy ("quotidien"/"hebdomadaire"/"mensuel") */
	granularity: "daily" | "weekly" | "monthly";
	/** True when a comparison series was joined onto `data` (overlay line) */
	hasComparison: boolean;
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

export type ChartConfig = {
	startDate: Date;
	pointCount: number;
	granularity: "daily" | "weekly" | "monthly";
	sqlDateFormat: string;
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
	fulfillmentStatus: FulfillmentStatus;
	total: number;
	customerName: string;
	customerEmail: string;
};

export type GetRecentOrdersReturn = {
	orders: RecentOrderItem[];
};

// ============================================================================
// TYPES - TOP PRODUCTS
// ============================================================================

export type TopProductItem = {
	productId: string | null;
	productSlug: string | null;
	title: string;
	imageUrl: string | null;
	unitsSold: number;
	revenue: number;
};

export type GetTopProductsReturn = {
	products: TopProductItem[];
};

// ============================================================================
// TYPES - ALERTS
// ============================================================================

export type DashboardAlerts = {
	pendingRefunds: number;
};

/**
 * Compteurs « à traiter » du dashboard (audit right-sizing §4.2).
 * Remplacent les crons d'alerte retirés (overbilled-orders / stuck-orders) : un coup
 * d'œil read-only à la connexion au lieu d'e-mails quotidiens.
 *
 * Pas de compteur de litiges : le modèle `Dispute` a été retiré en V1 (2026-07-30),
 * les deadlines de chargeback se suivent dans le Dashboard Stripe.
 */
export type DashboardActionItems = {
	/** Commandes sur-facturées non résolues (overbilledAmountCents non nul). */
	overbilledOrders: number;
	/** Commandes PAID en PROCESSING depuis plus de 7 jours. */
	stuckProcessing: number;
	/** Commandes SHIPPED depuis plus de 14 jours sans livraison confirmée. */
	stuckShipped: number;
	/** Commandes PAID sans numéro de facture depuis plus de 7 jours. */
	stuckInvoices: number;
	/** Paiements PENDING avec PaymentIntent orphelin depuis plus de 14 jours. */
	orphanPending: number;
};

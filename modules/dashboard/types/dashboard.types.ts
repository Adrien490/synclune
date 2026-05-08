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
};

// ============================================================================
// TYPES - REVIEW HEALTH (split from KPIs, cached `reference`)
// ============================================================================

export type GetReviewHealthReturn = {
	averageRating: number;
	totalReviews: number;
};

// ============================================================================
// TYPES - VAT THRESHOLD (franchise en base art. 293 B CGI)
// ============================================================================

export type GetVatProgressReturn = {
	/** Cumul du chiffre d'affaires payé depuis le 1er janvier de l'année en cours */
	ytdRevenue: number;
	/** Seuil de franchise applicable (37 500 € prestations / 85 000 € ventes) */
	threshold: number;
	/** Pourcentage du seuil atteint (0–100+) */
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
};

export type GetRevenueChartReturn = {
	data: RevenueDataPoint[];
	periodLabel: string;
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
	activeDisputes: number;
	lowStockSkus: number;
};

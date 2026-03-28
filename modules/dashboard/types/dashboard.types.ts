import {
	type FulfillmentStatus,
	type OrderStatus,
	type PaymentStatus,
} from "@/app/generated/prisma/client";

// ============================================================================
// TYPES - SERVICE INPUTS (from services/)
// ============================================================================

/**
 * Raw order data for transformation
 */
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
		evolution: number;
	};
	monthlyOrders: {
		count: number;
		evolution: number;
	};
	averageOrderValue: {
		amount: number;
		evolution: number;
	};
	conversionRate: {
		rate: number;
		evolution: number;
		abandoned: number;
	};
	pendingShipment: {
		count: number;
	};
	discountImpact: {
		amount: number;
		evolution: number;
	};
	reviewHealth: {
		averageRating: number;
		totalReviews: number;
	};
	newsletterGrowth: {
		totalActive: number;
		newThisMonth: number;
		evolution: number;
	};
	avgFulfillmentTime: {
		hours: number;
		evolution: number;
	};
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
// TYPES - ALERTS
// ============================================================================

// ============================================================================
// TYPES - FULFILLMENT PIPELINE
// ============================================================================

export type FulfillmentPipeline = {
	unfulfilled: number;
	processing: number;
	shipped: number;
	delivered: number;
	returned: number;
	lateShipments: number;
};

// ============================================================================
// TYPES - TOP PRODUCTS
// ============================================================================

export type TopProductItem = {
	productId: string | null;
	title: string;
	imageUrl: string | null;
	unitsSold: number;
	revenue: number;
};

export type GetTopProductsReturn = {
	products: TopProductItem[];
};

// ============================================================================
// TYPES - ACTIVE DISCOUNTS
// ============================================================================

export type ActiveDiscountItem = {
	id: string;
	code: string;
	type: string;
	value: number;
	usageCount: number;
	maxUsageCount: number | null;
	endsAt: Date | null;
};

export type GetActiveDiscountsReturn = {
	discounts: ActiveDiscountItem[];
};

// ============================================================================
// TYPES - ALERTS
// ============================================================================

export type DashboardAlerts = {
	pendingRefunds: number;
	activeDisputes: number;
	lowStockSkus: number;
	pendingCustomizations: number;
};

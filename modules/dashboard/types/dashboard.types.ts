import { type OrderStatus, type PaymentStatus } from "@/app/generated/prisma/client";

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
};

// ============================================================================
// TYPES - REVENUE CHART (RAW SQL)
// ============================================================================

export type RevenueRow = {
	date: string;
	revenue: bigint;
	orders: bigint;
};

// ============================================================================
// TYPES - REVENUE CHART
// ============================================================================

export type RevenueDataPoint = {
	date: string;
	revenue: number;
	orders: number;
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
	pendingRefunds: number;
	activeDisputes: number;
	lowStockSkus: number;
};

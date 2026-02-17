import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";

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
};

// ============================================================================
// TYPES - REVENUE CHART
// ============================================================================

export type RevenueDataPoint = {
	date: string;
	revenue: number;
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

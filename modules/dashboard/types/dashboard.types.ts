import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/client";

// ============================================================================
// TYPES - KPIs
// ============================================================================

export type GetKpisReturn = {
	todayRevenue: {
		amount: number;
		evolution: number;
	};
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
	pendingOrders: {
		count: number;
		urgentCount: number;
	};
	outOfStock: {
		count: number;
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
// TYPES - ORDERS STATUS
// ============================================================================

export type OrderStatusCount = {
	status: OrderStatus;
	count: number;
};

export type PaymentStatusCount = {
	status: PaymentStatus;
	count: number;
};

export type FulfillmentStatusCount = {
	status: FulfillmentStatus;
	count: number;
};

export type GetOrdersStatusReturn = {
	orderStatuses: OrderStatusCount[];
	paymentStatuses: PaymentStatusCount[];
	fulfillmentStatuses: FulfillmentStatusCount[];
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
// TYPES - TOP PRODUCTS
// ============================================================================

export type TopProductItem = {
	id: string;
	title: string;
	slug: string;
	imageUrl: string | null;
	totalSold: number;
	revenue: number;
};

export type GetTopProductsReturn = {
	products: TopProductItem[];
};

// ============================================================================
// TYPES - STOCK ALERTS
// ============================================================================

export type StockAlertItem = {
	id: string;
	sku: string;
	productId: string;
	productTitle: string;
	productSlug: string;
	inventory: number;
	variant: string;
};

export type GetStockAlertsReturn = {
	alerts: StockAlertItem[];
	totalCount: number;
};

// ============================================================================
// TYPES - VAT BREAKDOWN
// ============================================================================

export type VatBreakdownItem = {
	rate: number;
	totalTax: number;
	totalExclTax: number;
	totalInclTax: number;
	orderCount: number;
};

export type GetVatBreakdownReturn = {
	breakdown: VatBreakdownItem[];
	totals: {
		totalTax: number;
		totalExclTax: number;
		totalInclTax: number;
	};
	period: {
		start: Date;
		end: Date;
	};
};

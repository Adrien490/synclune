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

// ============================================================================
// TYPES - SALES STATS (Section Ventes)
// ============================================================================

export type SalesKpisReturn = {
	/** Chiffre d'affaires de la periode */
	revenue: {
		amount: number;
		evolution: number;
	};
	/** Nombre de commandes */
	ordersCount: {
		count: number;
		evolution: number;
	};
	/** Panier moyen */
	averageOrderValue: {
		amount: number;
		evolution: number;
	};
	/** Taux de conversion panier -> commande */
	conversionRate: {
		rate: number;
		evolution: number;
	};
};

export type CartAbandonmentReturn = {
	/** Taux d'abandon en pourcentage */
	rate: number;
	/** Nombre de paniers abandonnes */
	abandonedCarts: number;
	/** Nombre de paniers convertis */
	convertedCarts: number;
	/** Nombre total de paniers */
	totalCarts: number;
	/** Evolution par rapport a la periode precedente */
	evolution: number;
};

export type RevenueByCollectionItem = {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	revenue: number;
	ordersCount: number;
	unitsSold: number;
};

export type GetRevenueByCollectionReturn = {
	collections: RevenueByCollectionItem[];
	totalRevenue: number;
};

export type RevenueByTypeItem = {
	typeId: string;
	typeLabel: string;
	typeSlug: string;
	revenue: number;
	ordersCount: number;
	unitsSold: number;
};

export type GetRevenueByTypeReturn = {
	types: RevenueByTypeItem[];
	uncategorizedRevenue: number;
	totalRevenue: number;
};

// ============================================================================
// TYPES - INVENTORY STATS (Section Inventaire)
// ============================================================================

export type InventoryKpisReturn = {
	/** Nombre de SKUs en rupture de stock */
	outOfStock: {
		count: number;
	};
	/** Nombre de SKUs en stock bas */
	lowStock: {
		count: number;
		threshold: number;
	};
	/** Valeur totale du stock */
	stockValue: {
		amount: number;
		totalUnits: number;
	};
	/** Demandes de notification retour en stock */
	stockNotifications: {
		pendingCount: number;
	};
};

export type StockValueReturn = {
	/** Valeur totale en centimes */
	totalValue: number;
	/** Nombre de SKUs avec stock */
	skuCount: number;
	/** Nombre total d'unites en stock */
	totalUnits: number;
	/** Valeur moyenne par unite */
	averageUnitValue: number;
};

export type SkuTurnoverItem = {
	skuId: string;
	sku: string;
	productTitle: string;
	productSlug: string;
	/** Unites vendues sur la periode */
	unitsSold: number;
	/** Stock actuel */
	currentStock: number;
	/** Ratio de rotation (unitsSold / currentStock) */
	turnoverRatio: number;
};

export type GetSkuTurnoverReturn = {
	skus: SkuTurnoverItem[];
	averageRatio: number;
};

export type NeverSoldProductItem = {
	productId: string;
	title: string;
	slug: string;
	createdAt: Date;
	skuCount: number;
	totalInventory: number;
	totalValue: number;
};

export type GetNeverSoldProductsReturn = {
	products: NeverSoldProductItem[];
	totalCount: number;
};

export type StockByAttributeItem = {
	id: string;
	name: string;
	hex?: string;
	totalUnits: number;
	skuCount: number;
	value: number;
};

export type GetStockByColorReturn = {
	colors: StockByAttributeItem[];
	uncategorized: {
		totalUnits: number;
		value: number;
	};
};

export type GetStockByMaterialReturn = {
	materials: StockByAttributeItem[];
	uncategorized: {
		totalUnits: number;
		value: number;
	};
};

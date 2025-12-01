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

// NOTE: Le type TopProductItem est défini dans:
// - modules/dashboard/data/get-top-products.ts (via TopProductStats)
// - modules/dashboard/services/aggregate-top-products.ts
// Utiliser l'import depuis ces fichiers pour le typage des composants.

// ============================================================================
// TYPES - STOCK ALERTS
// ============================================================================

export type StockAlertItem = {
	skuId: string;
	sku: string;
	productTitle: string;
	inventory: number;
	alertType: "out_of_stock" | "low_stock";
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
	uncategorizedRevenue: number;
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

// ============================================================================
// TYPES - CUSTOMER STATS (Section Clients)
// ============================================================================

export type CustomerKpisReturn = {
	/** Nombre total de clients */
	totalCustomers: {
		count: number;
		evolution: number;
	};
	/** Nouveaux clients sur la periode */
	newCustomers: {
		count: number;
		evolution: number;
	};
	/** Taux de clients recurrents (>1 commande) */
	repeatRate: {
		rate: number;
		evolution: number;
	};
	/** Panier moyen premiere commande vs recurrents */
	firstOrderAov: {
		amount: number;
		repeatAov: number;
	};
};

export type CustomerAcquisitionDataPoint = {
	date: string;
	count: number;
};

export type GetCustomerAcquisitionReturn = {
	data: CustomerAcquisitionDataPoint[];
	totalNew: number;
};

export type RepeatCustomersReturn = {
	/** Nombre de clients avec 1 seule commande */
	oneTimeCustomers: number;
	/** Nombre de clients avec 2+ commandes */
	repeatCustomers: number;
	/** Nombre total de clients */
	totalCustomers: number;
	/** Taux de recurrence */
	repeatRate: number;
};

export type TopCustomerItem = {
	userId: string;
	name: string;
	email: string;
	ordersCount: number;
	totalSpent: number;
	lastOrderDate: Date;
};

export type GetTopCustomersReturn = {
	customers: TopCustomerItem[];
};

// ============================================================================
// TYPES - REFUND STATS
// ============================================================================

export type RefundStatsReturn = {
	/** Montant total rembourse */
	totalRefunded: {
		amount: number;
		evolution: number;
	};
	/** Nombre de remboursements */
	refundCount: {
		count: number;
		evolution: number;
	};
	/** Taux de remboursement (refunds / orders) */
	refundRate: {
		rate: number;
		evolution: number;
	};
};

// ============================================================================
// TYPES - DISCOUNT STATS
// ============================================================================

export type DiscountStatsReturn = {
	/** CA avec remise */
	revenueWithDiscount: {
		amount: number;
		evolution: number;
	};
	/** Montant total des remises */
	totalDiscountAmount: {
		amount: number;
		evolution: number;
	};
	/** Nombre de commandes avec remise */
	ordersWithDiscount: {
		count: number;
		evolution: number;
	};
	/** Codes promo non utilises */
	unusedCodes: {
		count: number;
	};
};

export type TopDiscountItem = {
	code: string;
	type: "PERCENTAGE" | "FIXED_AMOUNT";
	value: number;
	usageCount: number;
	totalDiscountGiven: number;
};

export type GetTopDiscountsReturn = {
	discounts: TopDiscountItem[];
};

// ============================================================================
// TYPES - FULFILLMENT STATS
// ============================================================================

export type GetFulfillmentStatusReturn = {
	statuses: FulfillmentStatusCount[];
};

// ============================================================================
// TYPES - REVENUE TRENDS (12 mois)
// ============================================================================

export type RevenueYearDataPoint = {
	month: string;
	revenue: number;
	ordersCount: number;
};

export type GetRevenueYearReturn = {
	data: RevenueYearDataPoint[];
	totalRevenue: number;
	yoyEvolution: number;
};

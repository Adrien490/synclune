/**
 * Dashboard Data Functions
 *
 * Ce fichier centralise les exports de toutes les fonctions de récupération
 * de données du module dashboard.
 */

// Cart & Checkout
export { fetchCartAbandonment } from "./get-cart-abandonment";

// Changelogs
export { getChangelogs } from "./get-changelogs";

// Contact Adrien
export { getContactAdrienVisibility } from "./get-contact-adrien-visibility";

// Customer KPIs
export { fetchCustomerKpis } from "./get-customer-kpis";

// Discount Stats
export { fetchDiscountStats } from "./get-discount-stats";

// Inventory KPIs
export { fetchInventoryKpis } from "./get-inventory-kpis";

// KPI Sparklines
export { fetchKpiSparklines } from "./get-kpi-sparklines";

// Main KPIs
export { fetchDashboardKpis } from "./get-kpis";

// Never Sold Products
export { fetchNeverSoldProducts } from "./get-never-sold";

// Orders Status
export { getOrdersStatus, fetchDashboardOrdersStatus } from "./get-orders-status";

// Recent Orders
export { getRecentOrders, fetchDashboardRecentOrders } from "./get-recent-orders";

// Refund Stats
export { fetchRefundStats } from "./get-refund-stats";

// Repeat Customers
export { fetchRepeatCustomers } from "./get-repeat-customers";

// Revenue By Collection
export { fetchRevenueByCollection } from "./get-revenue-by-collection";

// Revenue By Type
export { fetchRevenueByType } from "./get-revenue-by-type";

// Revenue Chart
export { getRevenueChart, fetchDashboardRevenueChart } from "./get-revenue-chart";

// Revenue Trends
export { fetchRevenueTrends } from "./get-revenue-trends";

// Sales KPIs
export { fetchSalesKpis } from "./get-sales-kpis";

// Stock Alerts
export { getStockAlerts, fetchDashboardStockAlerts } from "./get-stock-alerts";

// Stock By Attribute
export { fetchStockByColor, fetchStockByMaterial } from "./get-stock-by-attribute";

// Stock Value
export { fetchStockValue } from "./get-stock-value";

// Top Customers
export { getTopCustomers, fetchTopCustomers } from "./get-top-customers";

// Top Products
export { getTopProducts, fetchDashboardTopProducts } from "./get-top-products";

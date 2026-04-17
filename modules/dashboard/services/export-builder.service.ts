import type {
	GetKpisReturn,
	GetRevenueChartReturn,
	GetTopProductsReturn,
	GetRecentOrdersReturn,
	GetCustomerKpisReturn,
} from "../types/dashboard.types";
import type { ExportDashboardFormat } from "../schemas/export-dashboard.schema";
import type { DashboardPeriod } from "../constants/period.constants";
import { DASHBOARD_PERIODS } from "../constants/period.constants";

// ============================================================================
// EXPORT BUILDER SERVICE
// Pure functions assembling dashboard data into CSV / JSON payloads
// ============================================================================

export type DashboardExportSources = {
	kpis: GetKpisReturn;
	revenueChart: GetRevenueChartReturn;
	topProducts: GetTopProductsReturn;
	recentOrders: GetRecentOrdersReturn;
	customerKpis: GetCustomerKpisReturn;
};

export type DashboardExportPayload = {
	filename: string;
	mimeType: string;
	content: string;
};

const DATE_FORMATTER_PARTS = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "UTC",
});

function toIsoDate(date: Date): string {
	return DATE_FORMATTER_PARTS.format(date);
}

/**
 * CSV-escape a single cell: quote when the value contains a separator,
 * quote, newline, or leading/trailing space. Double internal quotes.
 */
export function escapeCsvCell(raw: string | number | null | undefined): string {
	if (raw === null || raw === undefined) return "";
	const value = String(raw);
	const needsQuoting = /[",\r\n]/.test(value) || /^\s|\s$/.test(value);
	if (!needsQuoting) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

function rowToCsv(row: Array<string | number | null | undefined>): string {
	return row.map(escapeCsvCell).join(",");
}

function buildKpisSection(kpis: GetKpisReturn): string[] {
	const header = rowToCsv(["Indicateur", "Valeur", "Evolution (%)"]);
	const rows = [
		rowToCsv(["Revenu brut (EUR)", kpis.monthlyRevenue.amount, kpis.monthlyRevenue.evolution]),
		rowToCsv(["Revenu net (EUR)", kpis.monthlyRevenue.netAmount, ""]),
		rowToCsv(["Remboursements (EUR)", kpis.monthlyRevenue.refundAmount, ""]),
		rowToCsv(["Nombre de remboursements", kpis.monthlyRevenue.refundCount, ""]),
		rowToCsv(["Commandes", kpis.monthlyOrders.count, kpis.monthlyOrders.evolution]),
		rowToCsv([
			"Panier moyen (EUR)",
			kpis.averageOrderValue.amount,
			kpis.averageOrderValue.evolution,
		]),
		rowToCsv(["Taux de conversion (%)", kpis.conversionRate.rate, kpis.conversionRate.evolution]),
		rowToCsv(["Paniers abandonnes", kpis.conversionRate.abandoned, ""]),
		rowToCsv(["Commandes a expedier", kpis.pendingShipment.count, ""]),
		rowToCsv(["Impact remises (EUR)", kpis.discountImpact.amount, kpis.discountImpact.evolution]),
		rowToCsv(["Note moyenne avis", kpis.reviewHealth.averageRating, ""]),
		rowToCsv(["Total avis", kpis.reviewHealth.totalReviews, ""]),
		rowToCsv([
			"Abonnes newsletter",
			kpis.newsletterGrowth.totalActive,
			kpis.newsletterGrowth.evolution,
		]),
		rowToCsv(["Nouveaux abonnes mois", kpis.newsletterGrowth.newThisMonth, ""]),
		rowToCsv([
			"Delai moyen expedition (h)",
			kpis.avgFulfillmentTime.hours,
			kpis.avgFulfillmentTime.evolution,
		]),
	];
	return ["## KPIS", header, ...rows];
}

function buildRevenueSection(chart: GetRevenueChartReturn): string[] {
	const header = rowToCsv([
		"Date",
		"Revenu (EUR)",
		"Commandes",
		"Sous-total (EUR)",
		"Remises (EUR)",
		"Livraison (EUR)",
	]);
	const rows = chart.data.map((point) =>
		rowToCsv([
			point.date,
			point.revenue,
			point.orders,
			point.subtotal,
			point.discounts,
			point.shipping,
		]),
	);
	return [`## REVENU (${chart.periodLabel})`, header, ...rows];
}

function buildTopProductsSection(topProducts: GetTopProductsReturn): string[] {
	const header = rowToCsv(["Rang", "Produit", "Unites vendues", "Revenu (EUR)"]);
	const rows = topProducts.products.map((product, index) =>
		rowToCsv([index + 1, product.title, product.unitsSold, product.revenue]),
	);
	return ["## TOP PRODUITS", header, ...rows];
}

function buildCustomerKpisSection(customerKpis: GetCustomerKpisReturn): string[] {
	const header = rowToCsv(["Indicateur", "Valeur", "Evolution (%)"]);
	const rows = [
		rowToCsv([
			"Nouveaux clients",
			customerKpis.newCustomers.count,
			customerKpis.newCustomers.evolution,
		]),
		rowToCsv([
			"Clients recurrents (%)",
			customerKpis.returningRate.rate,
			customerKpis.returningRate.evolution,
		]),
		rowToCsv([
			"Clients actifs sur la periode",
			customerKpis.returningRate.totalActiveCustomers,
			"",
		]),
		rowToCsv(["Nombre de clients recurrents", customerKpis.returningRate.returningCount, ""]),
		rowToCsv([
			"Meilleur client",
			customerKpis.topSpender ? customerKpis.topSpender.customerName : "—",
			"",
		]),
		rowToCsv([
			"Email meilleur client",
			customerKpis.topSpender ? customerKpis.topSpender.customerEmail : "",
			"",
		]),
		rowToCsv([
			"Total depense meilleur client (EUR)",
			customerKpis.topSpender ? customerKpis.topSpender.totalSpent : 0,
			"",
		]),
		rowToCsv([
			"Commandes meilleur client",
			customerKpis.topSpender ? customerKpis.topSpender.orderCount : 0,
			"",
		]),
	];
	return ["## KPIS CLIENTS", header, ...rows];
}

function buildRecentOrdersSection(recentOrders: GetRecentOrdersReturn): string[] {
	const header = rowToCsv([
		"Numero",
		"Date",
		"Client",
		"Email",
		"Statut",
		"Paiement",
		"Expedition",
		"Total (EUR)",
	]);
	const rows = recentOrders.orders.map((order) =>
		rowToCsv([
			order.orderNumber,
			toIsoDate(order.createdAt),
			order.customerName,
			order.customerEmail,
			order.status,
			order.paymentStatus,
			order.fulfillmentStatus,
			order.total,
		]),
	);
	return ["## COMMANDES RECENTES", header, ...rows];
}

function buildCsv(period: DashboardPeriod, sources: DashboardExportSources): string {
	const periodLabel = DASHBOARD_PERIODS[period].label;
	const generatedAt = new Date().toISOString();
	const header = [
		`# Rapport Dashboard Synclune`,
		`# Periode: ${periodLabel}`,
		`# Genere: ${generatedAt}`,
		"",
	];
	return [
		...header,
		...buildKpisSection(sources.kpis),
		"",
		...buildCustomerKpisSection(sources.customerKpis),
		"",
		...buildRevenueSection(sources.revenueChart),
		"",
		...buildTopProductsSection(sources.topProducts),
		"",
		...buildRecentOrdersSection(sources.recentOrders),
		"",
	].join("\n");
}

function buildJson(period: DashboardPeriod, sources: DashboardExportSources): string {
	return JSON.stringify(
		{
			period,
			periodLabel: DASHBOARD_PERIODS[period].label,
			generatedAt: new Date().toISOString(),
			kpis: sources.kpis,
			customerKpis: sources.customerKpis,
			revenueChart: sources.revenueChart,
			topProducts: sources.topProducts,
			recentOrders: sources.recentOrders,
		},
		null,
		2,
	);
}

export function buildDashboardExport(
	period: DashboardPeriod,
	format: ExportDashboardFormat,
	sources: DashboardExportSources,
): DashboardExportPayload {
	const timestamp = toIsoDate(new Date());
	const baseName = `dashboard-${period}-${timestamp}`;

	if (format === "json") {
		return {
			filename: `${baseName}.json`,
			mimeType: "application/json;charset=utf-8",
			content: buildJson(period, sources),
		};
	}

	return {
		filename: `${baseName}.csv`,
		mimeType: "text/csv;charset=utf-8",
		content: buildCsv(period, sources),
	};
}

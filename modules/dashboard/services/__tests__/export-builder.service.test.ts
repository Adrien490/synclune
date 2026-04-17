import { describe, it, expect } from "vitest";
import {
	buildDashboardExport,
	escapeCsvCell,
	type DashboardExportSources,
} from "../export-builder.service";

const baseSources: DashboardExportSources = {
	kpis: {
		monthlyRevenue: {
			amount: 12500,
			netAmount: 12000,
			refundAmount: 500,
			refundCount: 2,
			evolution: 8.5,
		},
		monthlyOrders: { count: 42, evolution: 12 },
		averageOrderValue: { amount: 298, evolution: -3.2 },
		conversionRate: { rate: 2.8, evolution: 0.4, abandoned: 18 },
		pendingShipment: { count: 5 },
		discountImpact: { amount: 320, evolution: 5 },
		reviewHealth: { averageRating: 4.8, totalReviews: 156 },
		newsletterGrowth: { totalActive: 1200, newThisMonth: 54, evolution: 4.5 },
		avgFulfillmentTime: { hours: 36, evolution: -10 },
	},
	revenueChart: {
		periodLabel: "Ce mois",
		data: [
			{ date: "2026-04-01", revenue: 1000, orders: 3, subtotal: 900, discounts: 0, shipping: 100 },
			{
				date: "2026-04-02",
				revenue: 1500,
				orders: 4,
				subtotal: 1350,
				discounts: 50,
				shipping: 200,
			},
		],
	},
	topProducts: {
		products: [
			{ productId: "p1", title: "Collier Lune", imageUrl: null, unitsSold: 10, revenue: 2500 },
			{ productId: "p2", title: 'Boucles "Soleil"', imageUrl: null, unitsSold: 7, revenue: 1800 },
		],
	},
	recentOrders: {
		orders: [
			{
				id: "o1",
				orderNumber: "SL-1001",
				createdAt: new Date("2026-04-15T10:00:00Z"),
				status: "DELIVERED",
				paymentStatus: "PAID",
				fulfillmentStatus: "SHIPPED",
				total: 290,
				customerName: "Alice, Durand",
				customerEmail: "alice@example.com",
			},
		],
	},
	customerKpis: {
		newCustomers: { count: 12, evolution: 25 },
		returningRate: {
			rate: 40,
			returningCount: 4,
			totalActiveCustomers: 10,
			evolution: 10,
		},
		topSpender: {
			userId: "u1",
			customerName: "Alice Dupont",
			customerEmail: "alice@example.com",
			totalSpent: 1500,
			orderCount: 3,
		},
	},
};

describe("escapeCsvCell", () => {
	it("returns value as-is when no special chars", () => {
		expect(escapeCsvCell("hello")).toBe("hello");
		expect(escapeCsvCell(42)).toBe("42");
	});

	it("returns empty string for null/undefined", () => {
		expect(escapeCsvCell(null)).toBe("");
		expect(escapeCsvCell(undefined)).toBe("");
	});

	it("quotes and escapes values containing commas", () => {
		expect(escapeCsvCell("a,b")).toBe('"a,b"');
	});

	it("doubles internal quotes", () => {
		expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
	});

	it("quotes newlines", () => {
		expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
	});

	it("quotes leading/trailing whitespace", () => {
		expect(escapeCsvCell(" leading")).toBe('" leading"');
		expect(escapeCsvCell("trailing ")).toBe('"trailing "');
	});
});

describe("buildDashboardExport", () => {
	it("builds CSV payload with correct filename + mimetype", () => {
		const payload = buildDashboardExport("month", "csv", baseSources);
		expect(payload.mimeType).toBe("text/csv;charset=utf-8");
		expect(payload.filename).toMatch(/^dashboard-month-\d{4}-\d{2}-\d{2}\.csv$/);
	});

	it("builds JSON payload with correct filename + mimetype", () => {
		const payload = buildDashboardExport("7d", "json", baseSources);
		expect(payload.mimeType).toBe("application/json;charset=utf-8");
		expect(payload.filename).toMatch(/^dashboard-7d-\d{4}-\d{2}-\d{2}\.json$/);
	});

	it("CSV contains the KPIs header and at least one KPI row", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain("## KPIS");
		expect(content).toContain("Indicateur,Valeur,Evolution (%)");
		expect(content).toContain("Revenu brut (EUR),12500,8.5");
	});

	it("CSV contains the revenue section with period label", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain("## REVENU (Ce mois)");
		expect(content).toContain("2026-04-01,1000,3,900,0,100");
	});

	it("CSV contains top products rows with rank", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain("## TOP PRODUITS");
		expect(content).toContain("1,Collier Lune,10,2500");
	});

	it("CSV escapes product titles containing quotes", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain('"Boucles ""Soleil"""');
	});

	it("CSV escapes customer names containing commas", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain('"Alice, Durand"');
	});

	it("CSV normalizes order date to ISO (UTC)", () => {
		const { content } = buildDashboardExport("month", "csv", baseSources);
		expect(content).toContain("SL-1001,2026-04-15");
	});

	it("JSON payload is valid and contains all sections", () => {
		const { content } = buildDashboardExport("quarter", "json", baseSources);
		const parsed = JSON.parse(content);
		expect(parsed.period).toBe("quarter");
		expect(parsed.periodLabel).toBe("Ce trimestre");
		expect(typeof parsed.generatedAt).toBe("string");
		expect(parsed.kpis.monthlyRevenue.amount).toBe(12500);
		expect(parsed.revenueChart.data).toHaveLength(2);
		expect(parsed.topProducts.products).toHaveLength(2);
		expect(parsed.recentOrders.orders).toHaveLength(1);
	});

	it("JSON preserves createdAt as ISO datetime string", () => {
		const { content } = buildDashboardExport("month", "json", baseSources);
		const parsed = JSON.parse(content);
		expect(parsed.recentOrders.orders[0].createdAt).toBe("2026-04-15T10:00:00.000Z");
	});
});

import { describe, it, expect } from "vitest";
import { InvoiceStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { buildExportWhereClause, generateOrdersCsv } from "../export-orders-csv.service";
import type { ExportInvoicesInput } from "../../schemas/order.schemas";

// ============================================================================
// Helpers
// ============================================================================

function input(overrides: Partial<ExportInvoicesInput> = {}): ExportInvoicesInput {
	return {
		periodType: "all",
		format: "csv",
		invoiceStatus: "all",
		...overrides,
	} as ExportInvoicesInput;
}

function makeOrder(overrides: Partial<{
	orderNumber: string;
	invoiceNumber: string | null;
	createdAt: Date;
	paidAt: Date | null;
	customerName: string;
	customerEmail: string;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	total: number;
	paymentMethod: string;
	paymentStatus: string;
	status: string;
}> = {}) {
	return {
		orderNumber: "SYN-001",
		invoiceNumber: "FAC-2024-001",
		createdAt: new Date("2024-03-15T10:00:00Z"),
		paidAt: new Date("2024-03-15T10:05:00Z"),
		customerName: "Jean Dupont",
		customerEmail: "jean.dupont@example.com",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 500,
		total: 5500,
		paymentMethod: "card",
		paymentStatus: "PAID",
		status: "DELIVERED",
		...overrides,
	};
}

// ============================================================================
// buildExportWhereClause
// ============================================================================

describe("buildExportWhereClause", () => {
	it("should return base where clause with paymentStatus PAID and deletedAt null when no period filter", () => {
		const result = buildExportWhereClause(input());
		expect(result.paymentStatus).toBe(PaymentStatus.PAID);
		expect(result.deletedAt).toBeNull();
		expect(result.paidAt).toBeUndefined();
	});

	it("should filter by year when periodType is year", () => {
		const result = buildExportWhereClause(input({ periodType: "year", year: 2024 }));
		expect(result.paidAt).toEqual({
			gte: new Date(2024, 0, 1),
			lt: new Date(2025, 0, 1),
		});
	});

	it("should filter by month when periodType is month", () => {
		const result = buildExportWhereClause(input({ periodType: "month", year: 2024, month: 3 }));
		expect(result.paidAt).toEqual({
			gte: new Date(2024, 2, 1),
			lt: new Date(2024, 3, 1),
		});
	});

	it("should filter by custom date range when periodType is custom", () => {
		const dateFrom = new Date("2024-01-01");
		const dateTo = new Date("2024-06-30");
		const result = buildExportWhereClause(input({ periodType: "custom", dateFrom, dateTo }));
		expect(result.paidAt).toEqual({
			gte: dateFrom,
			lte: dateTo,
		});
	});

	it("should filter by invoice status sent (maps to InvoiceStatus.GENERATED)", () => {
		const result = buildExportWhereClause(input({ invoiceStatus: "sent" }));
		expect(result.invoiceStatus).toBe(InvoiceStatus.GENERATED);
	});

	it("should filter by invoice status archived (maps to InvoiceStatus.VOIDED)", () => {
		const result = buildExportWhereClause(input({ invoiceStatus: "archived" }));
		expect(result.invoiceStatus).toBe(InvoiceStatus.VOIDED);
	});

	it("should not add invoiceStatus filter when invoiceStatus is all", () => {
		const result = buildExportWhereClause(input({ invoiceStatus: "all" }));
		expect(result.invoiceStatus).toBeUndefined();
	});
});

// ============================================================================
// generateOrdersCsv
// ============================================================================

describe("generateOrdersCsv", () => {
	it("should start with UTF-8 BOM", () => {
		const csv = generateOrdersCsv([makeOrder()]);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
	});

	it("should use semicolons as separator", () => {
		const csv = generateOrdersCsv([makeOrder()]);
		const headerRow = csv.replace("\uFEFF", "").split("\n")[0];
		expect(headerRow).toContain(";");
		expect(headerRow.split(";").length).toBeGreaterThan(1);
	});

	it("should have correct header row with 12 columns", () => {
		const csv = generateOrdersCsv([makeOrder()]);
		const headerRow = csv.replace("\uFEFF", "").split("\n")[0];
		const columns = headerRow.split(";");
		expect(columns).toHaveLength(12);
		expect(columns[0]).toBe("N° Facture");
		expect(columns[1]).toBe("N° Commande");
		expect(columns[2]).toBe("Date paiement");
		expect(columns[3]).toBe("Client");
		expect(columns[4]).toBe("Email");
		expect(columns[5]).toBe("Sous-total HT");
		expect(columns[6]).toBe("Réduction");
		expect(columns[7]).toBe("Livraison");
		expect(columns[8]).toBe("Total TTC");
		expect(columns[9]).toBe("Moyen de paiement");
		expect(columns[10]).toBe("Statut paiement");
		expect(columns[11]).toBe("Statut commande");
	});

	it("should format dates in French locale (dd/mm/yyyy)", () => {
		const order = makeOrder({ paidAt: new Date("2024-03-15T12:00:00Z") });
		const csv = generateOrdersCsv([order]);
		const dataRow = csv.replace("\uFEFF", "").split("\n")[1];
		// French locale formats as dd/mm/yyyy
		expect(dataRow).toContain("15/03/2024");
	});

	it("should format amounts in euros with comma as decimal separator", () => {
		const order = makeOrder({ subtotal: 5099, discountAmount: 500, shippingCost: 0, total: 4599 });
		const csv = generateOrdersCsv([order]);
		const dataRow = csv.replace("\uFEFF", "").split("\n")[1];
		expect(dataRow).toContain("50,99");
		expect(dataRow).toContain("5,00");
		expect(dataRow).toContain("0,00");
		expect(dataRow).toContain("45,99");
	});

	it("should escape CSV special characters in customer names", () => {
		const order = makeOrder({ customerName: 'Marie; "Dupont"' });
		const csv = generateOrdersCsv([order]);
		const dataRow = csv.replace("\uFEFF", "").split("\n")[1];
		// Value containing ; or " should be quoted and inner quotes doubled
		expect(dataRow).toContain('"Marie; ""Dupont"""');
	});

	it("should handle empty order array", () => {
		const csv = generateOrdersCsv([]);
		const lines = csv.replace("\uFEFF", "").split("\n");
		expect(lines).toHaveLength(1);
		expect(lines[0].split(";")).toHaveLength(12);
	});

	it("should handle null invoice numbers", () => {
		const order = makeOrder({ invoiceNumber: null });
		const csv = generateOrdersCsv([order]);
		const dataRow = csv.replace("\uFEFF", "").split("\n")[1];
		// First column (invoice number) should be empty
		expect(dataRow.startsWith(";")).toBe(true);
	});
});

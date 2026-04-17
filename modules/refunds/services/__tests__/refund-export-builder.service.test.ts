import { describe, it, expect } from "vitest";
import {
	buildRefundExport,
	escapeCsvCell,
	getPeriodStartDate,
	type RefundExportRow,
} from "../refund-export-builder.service";

function makeRow(overrides: Partial<RefundExportRow> = {}): RefundExportRow {
	return {
		id: "refund-1",
		orderNumber: "SYN-001",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		amount: 5000,
		currency: "EUR",
		status: "COMPLETED",
		reason: "CUSTOMER_REQUEST",
		stripeRefundId: "re_abc",
		note: null,
		failureReason: null,
		createdAt: new Date("2026-04-10T12:00:00Z"),
		processedAt: new Date("2026-04-10T14:00:00Z"),
		itemCount: 2,
		...overrides,
	};
}

describe("escapeCsvCell", () => {
	it("returns empty string for null/undefined", () => {
		expect(escapeCsvCell(null)).toBe("");
		expect(escapeCsvCell(undefined)).toBe("");
	});

	it("returns value unchanged when no special characters", () => {
		expect(escapeCsvCell("simple")).toBe("simple");
		expect(escapeCsvCell(123)).toBe("123");
	});

	it("quotes and escapes double quotes (RFC 4180)", () => {
		expect(escapeCsvCell('hello "world"')).toBe('"hello ""world"""');
	});

	it("quotes values containing commas", () => {
		expect(escapeCsvCell("a,b")).toBe('"a,b"');
	});

	it("quotes values containing newlines", () => {
		expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
		expect(escapeCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
	});

	it("quotes values with leading or trailing whitespace", () => {
		expect(escapeCsvCell(" leading")).toBe('" leading"');
		expect(escapeCsvCell("trailing ")).toBe('"trailing "');
	});
});

describe("getPeriodStartDate", () => {
	const ref = new Date("2026-04-17T10:00:00Z");

	it("returns null for 'all'", () => {
		expect(getPeriodStartDate("all", ref)).toBeNull();
	});

	it("returns 7 days ago for '7d'", () => {
		const start = getPeriodStartDate("7d", ref);
		const expected = new Date(ref);
		expected.setDate(expected.getDate() - 7);
		expect(start?.getTime()).toBe(expected.getTime());
	});

	it("returns 30 days ago for '30d'", () => {
		const start = getPeriodStartDate("30d", ref);
		const expected = new Date(ref);
		expected.setDate(expected.getDate() - 30);
		expect(start?.getTime()).toBe(expected.getTime());
	});

	it("returns first day of month for 'month'", () => {
		const start = getPeriodStartDate("month", ref);
		expect(start?.getMonth()).toBe(3); // April (0-indexed)
		expect(start?.getDate()).toBe(1);
	});

	it("returns first day of current quarter for 'quarter'", () => {
		const start = getPeriodStartDate("quarter", ref);
		expect(start?.getMonth()).toBe(3); // Q2 starts in April
		expect(start?.getDate()).toBe(1);
	});

	it("returns Jan 1 for 'year'", () => {
		const start = getPeriodStartDate("year", ref);
		expect(start?.getMonth()).toBe(0);
		expect(start?.getDate()).toBe(1);
		expect(start?.getFullYear()).toBe(2026);
	});
});

describe("buildRefundExport - CSV format", () => {
	it("emits CSV file with correct mime type and extension", () => {
		const payload = buildRefundExport("month", "csv", [makeRow()]);
		expect(payload.mimeType).toBe("text/csv;charset=utf-8");
		expect(payload.filename).toMatch(/^remboursements-month-\d{4}-\d{2}-\d{2}\.csv$/);
	});

	it("includes metadata header with period, date, count", () => {
		const payload = buildRefundExport("7d", "csv", [makeRow(), makeRow()]);
		expect(payload.content).toContain("# Export Remboursements Synclune");
		expect(payload.content).toContain("# Periode: 7 jours");
		expect(payload.content).toContain("# Nombre: 2");
	});

	it("emits CSV header row with all columns", () => {
		const payload = buildRefundExport("all", "csv", []);
		expect(payload.content).toContain("ID,N° Commande,Email client,Nom client");
		expect(payload.content).toContain("Nb articles");
	});

	it("translates status and reason enums to French labels", () => {
		const payload = buildRefundExport("all", "csv", [
			makeRow({ status: "PENDING", reason: "DEFECTIVE" }),
		]);
		expect(payload.content).toContain("En attente");
		expect(payload.content).toContain("Produit défectueux");
	});

	it("escapes fields containing commas and quotes", () => {
		const payload = buildRefundExport("all", "csv", [
			makeRow({ note: 'Contains "quotes", commas, and newlines\n.' }),
		]);
		expect(payload.content).toContain('"Contains ""quotes"", commas, and newlines\n."');
	});

	it("writes nulls as empty cells", () => {
		const payload = buildRefundExport("all", "csv", [
			makeRow({ stripeRefundId: null, processedAt: null, failureReason: null, note: null }),
		]);
		// Check the data row ends with empty cells
		const lines = payload.content.split("\n");
		const dataLine = lines.find((l) => l.startsWith("refund-1"));
		expect(dataLine).toBeDefined();
		expect(dataLine?.split(",")).toContain("");
	});

	it("returns empty body when no refunds provided", () => {
		const payload = buildRefundExport("all", "csv", []);
		expect(payload.content).toContain("# Nombre: 0");
	});
});

describe("buildRefundExport - JSON format", () => {
	it("emits JSON file with correct mime type and extension", () => {
		const payload = buildRefundExport("year", "json", []);
		expect(payload.mimeType).toBe("application/json;charset=utf-8");
		expect(payload.filename).toMatch(/^remboursements-year-\d{4}-\d{2}-\d{2}\.json$/);
	});

	it("serializes refunds with enum labels and ISO dates", () => {
		const payload = buildRefundExport("month", "json", [makeRow()]);
		const parsed = JSON.parse(payload.content);
		expect(parsed.count).toBe(1);
		expect(parsed.period).toBe("month");
		expect(parsed.periodLabel).toBe("Ce mois");
		expect(parsed.refunds[0].statusLabel).toBe("Remboursé");
		expect(parsed.refunds[0].reasonLabel).toBe("Rétractation client");
		expect(parsed.refunds[0].createdAt).toBe("2026-04-10T12:00:00.000Z");
	});

	it("handles null processedAt in JSON output", () => {
		const payload = buildRefundExport("all", "json", [makeRow({ processedAt: null })]);
		const parsed = JSON.parse(payload.content);
		expect(parsed.refunds[0].processedAt).toBeNull();
	});
});

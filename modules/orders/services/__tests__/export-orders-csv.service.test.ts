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

function makeOrder(
	overrides: Partial<{
		orderNumber: string;
		invoiceNumber: string | null;
		creditNoteNumber: string | null;
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
		refunds: { amount: number }[];
	}> = {},
) {
	return {
		orderNumber: "SYN-001",
		invoiceNumber: "FAC-2024-001",
		creditNoteNumber: null,
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
		refunds: [] as { amount: number }[],
		...overrides,
	};
}

// ============================================================================
// buildExportWhereClause
// ============================================================================

describe("buildExportWhereClause", () => {
	it("should return base where clause with encaissed statuses and deletedAt null when no period filter", () => {
		const result = buildExportWhereClause(input());
		expect(result.paymentStatus).toEqual({
			in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
		});
		expect(result.deletedAt).toBeNull();
		expect(result.paidAt).toBeUndefined();
	});

	/**
	 * @regression ANALYTICS-AUDIT-003
	 *
	 * Le livre de recettes (Art. 286 CGI) doit inclure les commandes remboursées :
	 * elles ont été encaissées et possèdent un `invoiceNumber`. Les exclure créerait
	 * des trous dans la séquence des numéros de facture.
	 */
	it("includes PARTIALLY_REFUNDED and REFUNDED orders (no gaps in invoice sequence)", () => {
		const result = buildExportWhereClause(input());
		expect(result.paymentStatus).toEqual({
			in: expect.arrayContaining([
				PaymentStatus.PARTIALLY_REFUNDED,
				PaymentStatus.REFUNDED,
			]) as PaymentStatus[],
		});
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

	/**
	 * @regression ORD-COMPLY-007 (audit conformité 2026-05-27)
	 *
	 * Verrouille que TOUS les filtres périodiques portent sur `paidAt` (fait
	 * générateur fiscal en micro-entreprise, Art. 50-0 CGI) et JAMAIS sur
	 * `createdAt`. Une commande créée en décembre payée en janvier doit être
	 * comptée dans l'export janvier.
	 */
	it.each([
		{ periodType: "year" as const, year: 2026, month: undefined },
		{ periodType: "month" as const, year: 2026, month: 5 },
		{
			periodType: "custom" as const,
			dateFrom: new Date("2026-01-01"),
			dateTo: new Date("2026-12-31"),
		},
	])("never filters by createdAt for periodType=$periodType", (params) => {
		const result = buildExportWhereClause(input(params));
		expect(result.createdAt).toBeUndefined();
		expect(result.paidAt).toBeDefined();
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
		const headerRow = csv.replace("\uFEFF", "").split("\n")[0]!;
		expect(headerRow).toContain(";");
		expect(headerRow.split(";").length).toBeGreaterThan(1);
	});

	it("should have correct header row with 15 columns", () => {
		const csv = generateOrdersCsv([makeOrder()]);
		const headerRow = csv.replace("\uFEFF", "").split("\n")[0]!;
		const columns = headerRow.split(";");
		expect(columns).toHaveLength(15);
		expect(columns[0]).toBe("N° Facture");
		expect(columns[1]).toBe("N° Avoir");
		expect(columns[2]).toBe("N° Commande");
		expect(columns[3]).toBe("Date paiement");
		expect(columns[4]).toBe("Client");
		expect(columns[5]).toBe("Email");
		expect(columns[6]).toBe("Sous-total");
		expect(columns[7]).toBe("Réduction");
		expect(columns[8]).toBe("Livraison");
		expect(columns[9]).toBe("Total");
		expect(columns[10]).toBe("Remboursé");
		expect(columns[11]).toBe("Net encaissé");
		expect(columns[12]).toBe("Moyen de paiement");
		expect(columns[13]).toBe("Statut paiement");
		expect(columns[14]).toBe("Statut commande");
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
		expect(lines[0]!.split(";")).toHaveLength(15);
	});

	/**
	 * @regression ANALYTICS-AUDIT-003
	 *
	 * Colonnes "Remboursé" / "Net encaissé" : reconstituent le CA net du livre de
	 * recettes depuis le CSV pour les commandes (partiellement) remboursées, plus
	 * le numéro d'avoir pour le rapprochement comptable.
	 */
	it("computes refunded amount and net (total - refunds) columns", () => {
		const order = makeOrder({ total: 10000, refunds: [{ amount: 500 }, { amount: 1500 }] });
		const csv = generateOrdersCsv([order]);
		const cells = csv.split("\n")[1]!.split(";");
		expect(cells[9]).toBe("100,00"); // Total
		expect(cells[10]).toBe("20,00"); // Remboursé (5,00 + 15,00)
		expect(cells[11]).toBe("80,00"); // Net encaissé
	});

	it("renders the credit note number in the N° Avoir column", () => {
		const order = makeOrder({ creditNoteNumber: "A-2024-00007" });
		const csv = generateOrdersCsv([order]);
		const cells = csv.split("\n")[1]!.split(";");
		expect(cells[1]).toBe("A-2024-00007");
	});

	it("should handle null invoice numbers", () => {
		const order = makeOrder({ invoiceNumber: null });
		const csv = generateOrdersCsv([order]);
		const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;
		// First column (invoice number) should be empty
		expect(dataRow.startsWith(";")).toBe(true);
	});

	// --------------------------------------------------------------------------
	// CSV injection \u2014 formula prefixes (OWASP A03)
	// --------------------------------------------------------------------------

	describe("CSV injection \u2014 formula prefixes", () => {
		it.each([
			["=", "=SUM(A1:A10)"],
			["+", "+1+1"],
			["-", "-2+3"],
			["@", "@SUM(A1)"],
			["\t", "\tDROP"],
			["\r", "\rEVIL"],
		])("escapes leading '%s' with a leading apostrophe", (_prefix, payload) => {
			const order = makeOrder({ customerName: payload });
			const csv = generateOrdersCsv([order]);
			const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;
			// Each field is delimited by `;` \u2014 the customerName cell must start with `'` then payload
			expect(dataRow).toContain(`;'${payload}`);
		});

		it("escapes formula payloads even when other CSV special chars are present", () => {
			const order = makeOrder({ customerName: '="cmd|/c calc"!A1' });
			const csv = generateOrdersCsv([order]);
			const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;
			// Formula prefix protected AND quoted because of the inner `"`
			expect(dataRow).toContain(`"'=""cmd|/c calc""!A1"`);
		});

		it("does NOT prefix safe customer names starting with regular characters", () => {
			const order = makeOrder({ customerName: "Alice Martin" });
			const csv = generateOrdersCsv([order]);
			const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;
			expect(dataRow).toContain(";Alice Martin;");
			expect(dataRow).not.toContain("'Alice Martin");
		});

		// Audit \u00AB Admin commandes \u00BB 2026-07-26 (P2-3) : `escapeCsv` n'\u00E9tait appliqu\u00E9
		// qu'\u00E0 `customerName`, ce qui rendait cette suite verte tout en laissant 14
		// colonnes brutes. `customerEmail` est la plus expos\u00E9e \u2014 le client la saisit
		// lui-m\u00EAme au checkout, et `z.email()` accepte `-x@example.com`.
		it.each([
			["customerEmail", { customerEmail: "-2+3@example.com" }],
			["paymentMethod", { paymentMethod: "=cmd" }],
			["orderNumber", { orderNumber: "@SYN-001" }],
			["invoiceNumber", { invoiceNumber: "+F-2026-00001" }],
			["creditNoteNumber", { creditNoteNumber: "-A-2026-00001" }],
		])("escapes formula prefixes in %s", (_field, overrides) => {
			const order = makeOrder(overrides);
			const csv = generateOrdersCsv([order]);
			const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;
			const payload = Object.values(overrides)[0] as string;

			expect(dataRow).toContain(`'${payload}`);
		});

		it("ne pr\u00E9fixe PAS les colonnes num\u00E9riques (un montant n\u00E9gatif reste un nombre)", () => {
			// Un `'` devant `-12,50` en ferait du texte dans le tableur : les montants
			// sont produits par nos formatters, pas par une saisie externe.
			const order = makeOrder({ total: 1000, refunds: [{ amount: 2500 }] });
			const csv = generateOrdersCsv([order]);
			const dataRow = csv.replace("\uFEFF", "").split("\n")[1]!;

			expect(dataRow).toContain("-15,00");
			expect(dataRow).not.toContain("'-15,00");
		});
	});
});

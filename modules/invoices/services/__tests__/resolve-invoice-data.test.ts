import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import { resolveInvoiceDataForRender } from "../resolve-invoice-data";
import { InvoiceSnapshotIntegrityError } from "../verify-invoice-snapshot";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

/**
 * @regression einv-pdf-001-render-from-snapshot
 *
 * Verrouille EINV-PDF-001 + EINV-PDF-003 : le rendu d'une facture doit TOUJOURS
 * partir du snapshot figé (`invoiceDataSnapshot`) plutôt que d'une recomputation
 * des colonnes Order, et vérifier son intégrité (SHA-256 vs `invoiceDataHash`)
 * avant usage. Toute dérive de `buildInvoiceData` ne doit pas altérer une
 * facture historique (Art. L102 B LPF).
 */

// `buildInvoiceData` est mocké pour matérialiser la "recomputation live" : si le
// resolver l'appelle alors qu'un snapshot existe, le test échoue (preuve que le
// snapshot n'a PAS été préféré).
const buildInvoiceDataMock = vi.fn();
vi.mock("../build-invoice-data", () => ({
	buildInvoiceData: (order: unknown) => buildInvoiceDataMock(order),
}));

function hashOf(snapshot: unknown): string {
	return createHash("sha256").update(canonicalJsonStringify(snapshot)).digest("hex");
}

const SNAPSHOT = {
	invoiceNumber: "F-2026-00042",
	issuedAt: "2026-05-01T10:00:00.000Z",
	currency: "EUR",
	seller: { legalName: "Léane Taddei", vatExemptionText: "TVA non applicable, art. 293 B du CGI" },
	lines: [{ lineNumber: 1, productTitle: "Collier Lune", unitPriceExclTax: 4999 }],
	totals: { totalInclTax: 4999, totalTax: 0 },
};

function makeOrder(overrides: Partial<GetOrderReturn>): GetOrderReturn {
	return {
		id: "order-1",
		invoiceNumber: "F-2026-00042",
		...overrides,
	} as unknown as GetOrderReturn;
}

describe("resolveInvoiceDataForRender (EINV-PDF-001/003)", () => {
	it("préfère le snapshot figé et n'appelle JAMAIS buildInvoiceData", () => {
		const order = makeOrder({
			invoiceDataSnapshot: SNAPSHOT,
			invoiceDataHash: hashOf(SNAPSHOT),
		} as Partial<GetOrderReturn>);

		const result = resolveInvoiceDataForRender(order);

		expect(result).toEqual(SNAPSHOT);
		expect(buildInvoiceDataMock).not.toHaveBeenCalled();
	});

	it("ignore une dérive de buildInvoiceData : le snapshot reste la source de vérité", () => {
		// Même si la recomputation produisait des données altérées, le snapshot prime.
		buildInvoiceDataMock.mockReturnValue({ invoiceNumber: "F-2026-00042", tampered: true });
		const order = makeOrder({
			invoiceDataSnapshot: SNAPSHOT,
			invoiceDataHash: hashOf(SNAPSHOT),
		} as Partial<GetOrderReturn>);

		const result = resolveInvoiceDataForRender(order);

		expect(result).toEqual(SNAPSHOT);
		expect(buildInvoiceDataMock).not.toHaveBeenCalled();
	});

	it("lève InvoiceSnapshotIntegrityError si le hash figé diverge du snapshot", () => {
		const order = makeOrder({
			invoiceDataSnapshot: SNAPSHOT,
			invoiceDataHash: "0".repeat(64), // hash volontairement faux
		} as Partial<GetOrderReturn>);

		expect(() => resolveInvoiceDataForRender(order)).toThrow(InvoiceSnapshotIntegrityError);
	});

	it("lit le snapshot depuis l'override `frozen` (route /invoice, select CUSTOMER)", () => {
		// L'order (CUSTOMER select) ne porte pas le snapshot — il vient du select dédié.
		const order = makeOrder({});

		const result = resolveInvoiceDataForRender(order, {
			invoiceDataSnapshot: SNAPSHOT,
			invoiceDataHash: hashOf(SNAPSHOT),
		});

		expect(result).toEqual(SNAPSHOT);
		expect(buildInvoiceDataMock).not.toHaveBeenCalled();
	});

	it("fallback legacy : recompose via buildInvoiceData quand aucun snapshot", () => {
		const recomputed = { invoiceNumber: "F-2025-00001", legacy: true };
		buildInvoiceDataMock.mockReturnValue(recomputed);
		const order = makeOrder({
			invoiceDataSnapshot: null,
			invoiceDataHash: null,
		} as Partial<GetOrderReturn>);

		const result = resolveInvoiceDataForRender(order);

		expect(result).toEqual(recomputed);
		expect(buildInvoiceDataMock).toHaveBeenCalledTimes(1);
	});
});

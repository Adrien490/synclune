import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import { verifyInvoiceSnapshot, InvoiceSnapshotIntegrityError } from "../verify-invoice-snapshot";

/**
 * @regression einv-global-005-snapshot-integrity
 *
 * Verrouille EINV-GLOBAL-005 : le snapshot `invoiceDataSnapshot` doit être
 * vérifié contre `invoiceDataHash` avant tout usage aval (transmission PDP).
 * Une divergence = corruption/altération → rejet (Art. L102 B LPF).
 */

function hashOf(snapshot: unknown): string {
	return createHash("sha256").update(canonicalJsonStringify(snapshot)).digest("hex");
}

describe("verifyInvoiceSnapshot (EINV-GLOBAL-005)", () => {
	const snapshot = {
		invoiceNumber: "F-2026-00042",
		currency: "EUR",
		totals: { totalInclTax: 4990, totalTax: 0 },
		seller: { siren: "839183027" },
	};

	it("renvoie le snapshot quand le hash recalculé matche le hash figé", () => {
		const expectedHash = hashOf(snapshot);
		const result = verifyInvoiceSnapshot("order-1", snapshot, expectedHash);
		expect(result.computedHash).toBe(expectedHash);
		expect(result.invoiceData).toEqual(snapshot);
	});

	it("est insensible à l'ordre d'insertion des clés (canonical JSON)", () => {
		const expectedHash = hashOf(snapshot);
		// Mêmes données, ordre de clés différent — doit produire le même hash.
		const reordered = {
			seller: { siren: "839183027" },
			totals: { totalTax: 0, totalInclTax: 4990 },
			currency: "EUR",
			invoiceNumber: "F-2026-00042",
		};
		expect(() => verifyInvoiceSnapshot("order-1", reordered, expectedHash)).not.toThrow();
	});

	it("throw InvoiceSnapshotIntegrityError si le snapshot a été altéré", () => {
		const frozenHash = hashOf(snapshot);
		const tampered = { ...snapshot, totals: { totalInclTax: 9999, totalTax: 0 } };
		expect(() => verifyInvoiceSnapshot("order-1", tampered, frozenHash)).toThrow(
			InvoiceSnapshotIntegrityError,
		);
	});

	it("expose expectedHash + computedHash sur l'erreur pour l'audit", () => {
		const frozenHash = hashOf(snapshot);
		const tampered = { ...snapshot, currency: "USD" };
		try {
			verifyInvoiceSnapshot("order-x", tampered, frozenHash);
			expect.unreachable("doit throw");
		} catch (e) {
			expect(e).toBeInstanceOf(InvoiceSnapshotIntegrityError);
			const err = e as InvoiceSnapshotIntegrityError;
			expect(err.orderId).toBe("order-x");
			expect(err.expectedHash).toBe(frozenHash);
			expect(err.computedHash).toBe(hashOf(tampered));
			expect(err.computedHash).not.toBe(frozenHash);
		}
	});

	it("best-effort rétro-compat : hash null (facture legacy) ne throw pas", () => {
		expect(() => verifyInvoiceSnapshot("order-legacy", snapshot, null)).not.toThrow();
		const result = verifyInvoiceSnapshot("order-legacy", snapshot, null);
		expect(result.invoiceData).toEqual(snapshot);
	});

	it("throw si le snapshot est absent (état incohérent)", () => {
		expect(() => verifyInvoiceSnapshot("order-2", null, "abc")).toThrow(/absent/);
		expect(() => verifyInvoiceSnapshot("order-2", undefined, "abc")).toThrow(/absent/);
	});
});

import { describe, expect, it } from "vitest";
import type { InvoiceProvider } from "../../types/invoice-provider";
import { LocalPdfProvider } from "../local-pdf.provider";
import { MockProvider } from "../mock.provider";

/**
 * Suite de tests **contract** — chaque implémentation `InvoiceProvider` doit
 * passer ces vérifications sémantiques. TypeScript garantit déjà la signature ;
 * cette suite garantit le comportement (idempotence, fail-safety).
 *
 * Synclune (micro-entreprise franchise TVA, B2C) ne transmet pas de facture
 * B2B/B2G : le contrat provider se limite à l'e-reporting B2C agrégé.
 */
const providers: Array<{ name: string; build: () => InvoiceProvider }> = [
	{ name: "LocalPdfProvider", build: () => new LocalPdfProvider() },
	{ name: "MockProvider", build: () => new MockProvider() },
];

describe.each(providers)("InvoiceProvider contract — $name", ({ build }) => {
	it("declares a non-empty id", () => {
		const provider = build();
		expect(typeof provider.id).toBe("string");
		expect(provider.id.length).toBeGreaterThan(0);
	});

	it("declares boolean eReporting capability", () => {
		const provider = build();
		expect(typeof provider.capabilities.eReporting).toBe("boolean");
	});

	it("submitEReportingBatch never throws on empty batch (graceful no-I/O)", async () => {
		const provider = build();
		const result = await provider.submitEReportingBatch({
			batch: {
				periodFrom: new Date(),
				periodTo: new Date(),
				transactionCount: 0,
				totalAmountIncTax: 0,
				totalAmountExclTax: 0,
				totalTaxAmount: 0,
				transactions: [],
			},
			idempotencyKey: "contract-test-batch",
		});
		expect(typeof result.providerBatchId).toBe("string");
		expect(["PENDING", "SENT", "ACCEPTED", "REJECTED", "RETRYING", "ABANDONED"]).toContain(
			result.status,
		);
	});
});

describe("MockProvider — e-reporting", () => {
	it("records the idempotencyKey passed by the caller (EINV-EREPORT-003)", async () => {
		const provider = new MockProvider();
		await provider.submitEReportingBatch({
			batch: {
				periodFrom: new Date(),
				periodTo: new Date(),
				transactionCount: 0,
				totalAmountIncTax: 0,
				totalAmountExclTax: 0,
				totalTaxAmount: 0,
				transactions: [],
			},
			idempotencyKey: "batch-2027-01-15",
		});
		expect(provider.lastBatchIdempotencyKey).toBe("batch-2027-01-15");
	});

	it("derives a deterministic providerBatchId from the idempotencyKey", async () => {
		const provider = new MockProvider();
		const input = {
			batch: {
				periodFrom: new Date(),
				periodTo: new Date(),
				transactionCount: 0,
				totalAmountIncTax: 0,
				totalAmountExclTax: 0,
				totalTaxAmount: 0,
				transactions: [],
			},
			idempotencyKey: "batch-xyz",
		};
		const first = await provider.submitEReportingBatch(input);
		const second = await provider.submitEReportingBatch(input);
		expect(first.providerBatchId).toBe(second.providerBatchId);
		expect(first.status).toBe("SENT");
	});
});

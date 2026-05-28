import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression ereporting-models-2026-05-28
 *
 * Verrouille la présence des modèles e-reporting B2C
 * (Phase 3 — EINV-AUDIT-004). Sans ces modèles, impossible d'agréger
 * et de transmettre les transactions B2C à la DGFiP au 1ᵉʳ septembre 2027.
 */
describe("EReporting Prisma models (Phase 3)", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found`);
		return match[1]!;
	}

	describe("Enums", () => {
		it("EReportingTransactionType has SALES, REFUND, PAYMENT", () => {
			expect(schema).toMatch(
				/enum\s+EReportingTransactionType\s*\{[\s\S]*?SALES[\s\S]*?REFUND[\s\S]*?PAYMENT[\s\S]*?\}/,
			);
		});

		it("EReportingStatus covers full lifecycle (PENDING → ABANDONED)", () => {
			expect(schema).toMatch(
				/enum\s+EReportingStatus\s*\{[\s\S]*?PENDING[\s\S]*?SENT[\s\S]*?ACCEPTED[\s\S]*?REJECTED[\s\S]*?RETRYING[\s\S]*?ABANDONED[\s\S]*?\}/,
			);
		});
	});

	describe("EReportingBatch", () => {
		const batch = extractModel("EReportingBatch");

		it("has providerBatchId unique (idempotence transmission PDP)", () => {
			expect(batch).toMatch(/^\s*providerBatchId\s+String\?\s+@unique\s+@db\.VarChar\(255\)/m);
		});

		it("has status with default PENDING", () => {
			expect(batch).toMatch(/^\s*status\s+EReportingStatus\s+@default\(PENDING\)/m);
		});

		it("indexed (status, periodFrom) for the transmit cron", () => {
			expect(batch).toMatch(/@@index\(\[status,\s*periodFrom\]\)/);
		});

		it("indexed (periodFrom, periodTo) for fiscal dashboard queries", () => {
			expect(batch).toMatch(/@@index\(\[periodFrom,\s*periodTo\]\)/);
		});

		it("declares transactions back-relation", () => {
			expect(batch).toMatch(/^\s*transactions\s+EReportingTransaction\[\]/m);
		});
	});

	describe("EReportingTransaction", () => {
		const tx = extractModel("EReportingTransaction");

		it("has SetNull FK to Order (preserves history if order soft-deleted)", () => {
			expect(tx).toMatch(/order\s+Order\?[\s\S]*?onDelete:\s*SetNull/);
		});

		it("has SetNull FK to Refund (parity with Order)", () => {
			expect(tx).toMatch(/refund\s+Refund\?[\s\S]*?onDelete:\s*SetNull/);
		});

		it("has SetNull FK to Batch (transaction survives batch purge)", () => {
			expect(tx).toMatch(/batch\s+EReportingBatch\?[\s\S]*?onDelete:\s*SetNull/);
		});

		it("countryCode is VarChar(2) (ISO 3166-1 alpha-2)", () => {
			expect(tx).toMatch(/^\s*countryCode\s+String\s+@db\.VarChar\(2\)/m);
		});

		it("payloadSnapshot is Json (immutable snapshot for DGFiP transmission)", () => {
			expect(tx).toMatch(/^\s*payloadSnapshot\s+Json\b/m);
		});

		it("indexed (status, occurredAt) for the aggregation cron", () => {
			expect(tx).toMatch(/@@index\(\[status,\s*occurredAt\]\)/);
		});
	});

	describe("Back-relations on Order and Refund", () => {
		it("Order declares eReportingTransactions", () => {
			const order = extractModel("Order");
			expect(order).toMatch(/^\s*eReportingTransactions\s+EReportingTransaction\[\]/m);
		});

		it("Refund declares eReportingTransactions", () => {
			const refund = extractModel("Refund");
			expect(refund).toMatch(/^\s*eReportingTransactions\s+EReportingTransaction\[\]/m);
		});
	});
});

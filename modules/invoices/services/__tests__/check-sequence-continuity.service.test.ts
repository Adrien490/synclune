import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
		refund: { findMany: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

import { checkSequenceContinuity } from "../check-sequence-continuity.service";

/**
 * Câble `prisma.order.findMany` qui est appelé DEUX fois par année (factures via
 * `where.invoiceNumber`, avoirs Order via `where.creditNoteNumber`). On branche
 * sur la clé du `where` pour servir le bon jeu.
 */
function wireOrder(invoiceNumbers: string[], orderCreditNotes: string[]): void {
	mockPrisma.order.findMany.mockImplementation(async (args: { where: Record<string, unknown> }) => {
		if ("invoiceNumber" in args.where) {
			return invoiceNumbers.map((invoiceNumber) => ({ invoiceNumber }));
		}
		return orderCreditNotes.map((creditNoteNumber) => ({ creditNoteNumber }));
	});
}

function wireRefund(refundCreditNotes: string[]): void {
	mockPrisma.refund.findMany.mockResolvedValue(
		refundCreditNotes.map((creditNoteNumber) => ({ creditNoteNumber })),
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	wireOrder([], []);
	wireRefund([]);
});

describe("checkSequenceContinuity (EINV-SEQ-007 — Art. 286 CGI)", () => {
	it("séquence facture contiguë → aucune anomalie", async () => {
		wireOrder(["F-2026-00001", "F-2026-00002", "F-2026-00003"], []);

		const issues = await checkSequenceContinuity([2026]);

		expect(issues).toEqual([]);
	});

	it("détecte un trou dans la séquence facture (00001, 00003 → manque 00002)", async () => {
		wireOrder(["F-2026-00001", "F-2026-00003"], []);

		const issues = await checkSequenceContinuity([2026]);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			kind: "invoice",
			year: 2026,
			prefix: "F-2026-",
			max: 3,
			missing: [2],
			duplicates: [],
		});
	});

	it("détecte plusieurs trous + ne signale pas au-delà du max", async () => {
		wireOrder(["F-2026-00001", "F-2026-00004"], []);

		const issues = await checkSequenceContinuity([2026]);

		expect(issues[0]?.missing).toEqual([2, 3]);
		expect(issues[0]?.max).toBe(4);
	});

	it("détecte un doublon avoir CROSS-TABLE (même numéro sur Order ET Refund)", async () => {
		// Avoir A-2026-00001 présent à la fois sur Order et Refund → unicité
		// cross-table violée (ce que les @unique par table ne détectent pas).
		wireOrder([], ["A-2026-00001"]);
		wireRefund(["A-2026-00001", "A-2026-00002"]);

		const issues = await checkSequenceContinuity([2026]);

		const creditNoteIssue = issues.find((i) => i.kind === "credit-note");
		expect(creditNoteIssue).toBeDefined();
		expect(creditNoteIssue?.duplicates).toContain("A-2026-00001");
	});

	it("avoir contigu réparti Order ∪ Refund → aucune anomalie", async () => {
		wireOrder([], ["A-2026-00002"]);
		wireRefund(["A-2026-00001", "A-2026-00003"]);

		const issues = await checkSequenceContinuity([2026]);

		expect(issues.find((i) => i.kind === "credit-note")).toBeUndefined();
	});

	it("séquences vides → aucune anomalie (pas de faux positif sur année sans facture)", async () => {
		const issues = await checkSequenceContinuity([2027]);
		expect(issues).toEqual([]);
	});

	it("traite plusieurs années indépendamment", async () => {
		// Trou en 2026, sain en 2025 → une seule anomalie (2026).
		mockPrisma.order.findMany.mockImplementation(
			async (args: { where: Record<string, unknown> }) => {
				if ("invoiceNumber" in args.where) {
					const prefix = (args.where.invoiceNumber as { startsWith: string }).startsWith;
					if (prefix === "F-2026-")
						return [{ invoiceNumber: "F-2026-00001" }, { invoiceNumber: "F-2026-00003" }];
					return [{ invoiceNumber: "F-2025-00001" }];
				}
				return [];
			},
		);

		const issues = await checkSequenceContinuity([2026, 2025]);

		expect(issues).toHaveLength(1);
		expect(issues[0]?.year).toBe(2026);
	});
});

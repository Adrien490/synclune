import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));

import {
	buildOrderSearchConditions,
	buildOrderFilterConditions,
	buildOrderWhereClause,
} from "../order-query-builder";
import type { OrderFilters, GetOrdersParams } from "../../types/order.types";

function filters(overrides: Partial<OrderFilters> = {}): OrderFilters {
	return { showDeleted: "active", ...overrides } as OrderFilters;
}

function params(overrides: Partial<GetOrdersParams> = {}): GetOrdersParams {
	return {
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		...overrides,
	} as GetOrdersParams;
}

// ============================================================================
// buildOrderSearchConditions
// ============================================================================

describe("buildOrderSearchConditions", () => {
	it("should return null for empty string", () => {
		expect(buildOrderSearchConditions("")).toBeNull();
	});

	it("should return null for whitespace-only string", () => {
		expect(buildOrderSearchConditions("   ")).toBeNull();
	});

	it("should return OR conditions for a search term", () => {
		const result = buildOrderSearchConditions("SYN-001");
		expect(result).not.toBeNull();
		// EINV-GLOBAL-016 : invoiceNumber + creditNoteNumber ajoutés aux 4 critères
		// historiques (orderNumber / user.email / user.name / stripePaymentIntentId).
		expect(result!.OR).toHaveLength(6);
	});

	it("EINV-GLOBAL-016 : should include invoiceNumber search (admin rapprochement comptable)", () => {
		const result = buildOrderSearchConditions("F-2026-00042");
		expect(result!.OR).toContainEqual({
			invoiceNumber: { contains: "F-2026-00042", mode: "insensitive" },
		});
	});

	it("EINV-GLOBAL-016 : should include creditNoteNumber search (avoir Art. 272-I)", () => {
		const result = buildOrderSearchConditions("A-2026-00012");
		expect(result!.OR).toContainEqual({
			creditNoteNumber: { contains: "A-2026-00012", mode: "insensitive" },
		});
	});

	it("should include orderNumber search", () => {
		const result = buildOrderSearchConditions("SYN-001");
		expect(result!.OR).toContainEqual({
			orderNumber: { contains: "SYN-001", mode: "insensitive" },
		});
	});

	// Colonnes SNAPSHOT et non la relation `user` (achat 100 % invité depuis le
	// retrait de l'espace client 2026-07-31) : l'ancien contrat `user.email`/
	// `user.name` verrouillait une recherche client qui ne matchait plus jamais
	// dès que le chemin fuzzy dégradait (audit « Admin commandes » 2026-08-01).
	it("should search the customerEmail snapshot column", () => {
		const result = buildOrderSearchConditions("test@example.com");
		expect(result!.OR).toContainEqual({
			customerEmail: { contains: "test@example.com", mode: "insensitive" },
		});
	});

	it("should search the customerName snapshot column", () => {
		const result = buildOrderSearchConditions("Jean");
		expect(result!.OR).toContainEqual({
			customerName: { contains: "Jean", mode: "insensitive" },
		});
	});

	it("should never search through the dead user relation", () => {
		const result = buildOrderSearchConditions("test@example.com");
		expect(JSON.stringify(result)).not.toContain('"user"');
	});

	it("should include stripePaymentIntentId search (underscore échappé — joker LIKE)", () => {
		const result = buildOrderSearchConditions("pi_123");
		// `_` est un joker LIKE mono-caractère : sans échappement, "pi_123"
		// matchait aussi "piX123". Le pattern échappé matche toujours le littéral.
		expect(result!.OR).toContainEqual({
			stripePaymentIntentId: { contains: "pi\\_123", mode: "insensitive" },
		});
	});

	it("should trim the search term", () => {
		const result = buildOrderSearchConditions("  SYN-001  ");
		expect(result!.OR).toContainEqual({
			orderNumber: { contains: "SYN-001", mode: "insensitive" },
		});
	});
});

// ============================================================================
// buildOrderFilterConditions
// ============================================================================

describe("buildOrderFilterConditions", () => {
	it("should exclude PENDING by default when no status filter", () => {
		const result = buildOrderFilterConditions(filters({}));
		expect(result.status).toEqual({ not: "PENDING" });
	});

	it("should filter by single status", () => {
		const result = buildOrderFilterConditions(filters({ status: "SHIPPED" }));
		expect(result.status).toBe("SHIPPED");
	});

	it("should filter by multiple statuses", () => {
		const result = buildOrderFilterConditions(
			filters({
				status: ["SHIPPED", "DELIVERED"],
			}),
		);
		expect(result.status).toEqual({ in: ["SHIPPED", "DELIVERED"] });
	});

	it("should unwrap single-element array status", () => {
		const result = buildOrderFilterConditions(filters({ status: ["PROCESSING"] }));
		expect(result.status).toBe("PROCESSING");
	});

	it("should filter by single paymentStatus", () => {
		const result = buildOrderFilterConditions(filters({ paymentStatus: "PAID" }));
		expect(result.paymentStatus).toBe("PAID");
	});

	it("should filter by multiple paymentStatuses", () => {
		const result = buildOrderFilterConditions(
			filters({
				paymentStatus: ["PAID", "REFUNDED"],
			}),
		);
		expect(result.paymentStatus).toEqual({ in: ["PAID", "REFUNDED"] });
	});

	// L'ex-cas « single fulfillmentStatus » a disparu avec l'axe : il fait doublon
	// avec « should filter by single status » ci-dessus (Lot 4, audit V2).
	it("should filter by single invoiceStatus", () => {
		const result = buildOrderFilterConditions(
			filters({
				invoiceStatus: "GENERATED",
			}),
		);
		expect(result.invoiceStatus).toBe("GENERATED");
	});

	it("should filter by multiple invoiceStatuses (admin audit fiscal)", () => {
		const result = buildOrderFilterConditions(
			filters({
				invoiceStatus: ["GENERATED", "VOIDED"],
			}),
		);
		expect(result.invoiceStatus).toEqual({ in: ["GENERATED", "VOIDED"] });
	});

	it("does not add invoiceStatus condition when unset", () => {
		const result = buildOrderFilterConditions(filters({}));
		expect(result.invoiceStatus).toBeUndefined();
	});

	it("should filter by totalMin only", () => {
		const result = buildOrderFilterConditions(filters({ totalMin: 1000 }));
		expect(result.total).toEqual({ gte: 1000 });
	});

	it("should filter by totalMax only", () => {
		const result = buildOrderFilterConditions(filters({ totalMax: 5000 }));
		expect(result.total).toEqual({ lte: 5000 });
	});

	it("should filter by totalMin and totalMax", () => {
		const result = buildOrderFilterConditions(
			filters({
				totalMin: 1000,
				totalMax: 5000,
			}),
		);
		expect(result.total).toEqual({ gte: 1000, lte: 5000 });
	});

	it("should filter by createdAfter only", () => {
		const date = new Date("2024-01-01");
		const result = buildOrderFilterConditions(filters({ createdAfter: date }));
		expect(result.createdAt).toEqual({ gte: date });
	});

	it("should filter by createdBefore only", () => {
		const date = new Date("2024-12-31");
		const result = buildOrderFilterConditions(filters({ createdBefore: date }));
		expect(result.createdAt).toEqual({ lte: date });
	});

	it("should filter by createdAfter and createdBefore", () => {
		const after = new Date("2024-01-01");
		const before = new Date("2024-12-31");
		const result = buildOrderFilterConditions(
			filters({
				createdAfter: after,
				createdBefore: before,
			}),
		);
		expect(result.createdAt).toEqual({ gte: after, lte: before });
	});

	it("should combine multiple filters", () => {
		const result = buildOrderFilterConditions(
			filters({
				status: "SHIPPED",
				paymentStatus: "PAID",
				totalMin: 500,
			}),
		);
		expect(result.status).toBe("SHIPPED");
		expect(result.paymentStatus).toBe("PAID");
		expect(result.total).toEqual({ gte: 500 });
	});

	it("EINV-UI-005 : preset invoiceAnomaly → PAID + invoiceNumber null", () => {
		const result = buildOrderFilterConditions(filters({ invoiceAnomaly: true }));
		expect(result.paymentStatus).toBe("PAID");
		expect(result.invoiceNumber).toBeNull();
	});

	it("EINV-UI-106 : preset pdfNotArchived → invoiceStatus GENERATED + invoicePdfUrl null", () => {
		const result = buildOrderFilterConditions(filters({ pdfNotArchived: true }));
		expect(result.invoiceStatus).toBe("GENERATED");
		expect(result.invoicePdfUrl).toBeNull();
	});

	it("EINV-UI-106 : preset retryDeferred → invoiceRetryDeferred true", () => {
		const result = buildOrderFilterConditions(filters({ retryDeferred: true }));
		expect(result.invoiceRetryDeferred).toBe(true);
	});

	it("EINV-UI-106 : presets désactivés n'ajoutent aucune condition facturation", () => {
		const result = buildOrderFilterConditions(filters({}));
		expect(result.invoicePdfUrl).toBeUndefined();
		expect(result.invoiceRetryDeferred).toBeUndefined();
	});
});

// ============================================================================
// buildOrderWhereClause
// ============================================================================

describe("buildOrderWhereClause", () => {
	it("should set deletedAt to null by default (active only)", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.deletedAt).toBeNull();
	});

	it("should show only deleted orders when showDeleted is 'deleted'", () => {
		const result = buildOrderWhereClause(
			params({ filters: { showDeleted: "deleted" } as OrderFilters }),
		);
		expect(result.deletedAt).toEqual({ not: null });
	});

	it("should not filter by deletedAt when showDeleted is 'all'", () => {
		const result = buildOrderWhereClause(
			params({ filters: { showDeleted: "all" } as OrderFilters }),
		);
		expect(result.deletedAt).toBeUndefined();
	});

	it("should include default filter conditions (exclude PENDING)", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.AND).toBeDefined();
		expect(result.AND).toContainEqual(expect.objectContaining({ status: { not: "PENDING" } }));
	});

	it("should add search conditions when search is provided", () => {
		const result = buildOrderWhereClause(params({ search: "SYN-001" }));
		expect(result.AND).toBeDefined();
		expect((result.AND as unknown[]).length).toBeGreaterThan(1);
	});

	it("should include fuzzy IDs when provided", () => {
		const result = buildOrderWhereClause(params({ search: "test" }), ["id1", "id2"]);
		const andConditions = result.AND as Array<Record<string, unknown>>;
		const orCondition = andConditions.find((c) => "OR" in c);
		expect(orCondition).toBeDefined();
	});

	it("should use only fuzzy IDs when search produces no exact conditions", () => {
		const result = buildOrderWhereClause(params({}), ["id1", "id2"]);
		// No search term, no fuzzy condition added
		expect(result.AND).toBeDefined();
	});

	it("should handle no search and no fuzzy IDs", () => {
		const result = buildOrderWhereClause(params({}));
		expect(result.AND).toBeDefined();
		// Only filter conditions
		expect(result.AND).toHaveLength(1);
	});
});

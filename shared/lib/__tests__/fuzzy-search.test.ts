import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockTransaction, mockLogger } = vi.hoisted(() => ({
	mockTransaction: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$transaction: mockTransaction,
	},
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/products/utils/trigram-helpers", () => ({
	setTrigramThreshold: vi.fn(),
	setStatementTimeout: vi.fn(),
}));

import { fuzzySearchIds } from "../fuzzy-search";

// ============================================================================
// Helpers
// ============================================================================

function validColumns() {
	return [{ table: "Order", column: "customerName" }];
}

// ============================================================================
// Tests: Input validation
// ============================================================================

describe("fuzzySearchIds — input validation", () => {
	it("returns null for an empty search term", async () => {
		const result = await fuzzySearchIds("", { columns: validColumns() });
		expect(result).toBeNull();
	});

	it("returns null for a term shorter than 2 characters", async () => {
		const result = await fuzzySearchIds("a", { columns: validColumns() });
		expect(result).toBeNull();
	});

	it("returns null for a whitespace-only term", async () => {
		const result = await fuzzySearchIds("   ", { columns: validColumns() });
		expect(result).toBeNull();
	});

	it("trims the term before checking length", async () => {
		// "  a  " trims to "a" which is < 2 chars
		const result = await fuzzySearchIds("  a  ", { columns: validColumns() });
		expect(result).toBeNull();
	});
});

// ============================================================================
// Tests: Allowlist validation
// ============================================================================

describe("fuzzySearchIds — allowlist validation", () => {
	it("throws for a disallowed column", async () => {
		await expect(
			fuzzySearchIds("test", {
				columns: [{ table: "User", column: "password" }],
			}),
		).rejects.toThrow("[SEARCH] Disallowed fuzzy search column: User.password");
	});

	it("throws for a disallowed table", async () => {
		await expect(
			fuzzySearchIds("test", {
				columns: [{ table: "Secret", column: "name" }],
			}),
		).rejects.toThrow("[SEARCH] Disallowed fuzzy search column: Secret.name");
	});

	it("throws for SQL injection attempt in table name", async () => {
		await expect(
			fuzzySearchIds("test", {
				columns: [{ table: 'User"."evil', column: "name" }],
			}),
		).rejects.toThrow("[SEARCH] Disallowed fuzzy search column");
	});

	it("does not throw for an allowed column", async () => {
		mockTransaction.mockResolvedValue([{ id: "1" }]);

		await expect(
			fuzzySearchIds("test", {
				columns: [{ table: "Order", column: "customerName" }],
			}),
		).resolves.not.toThrow();
	});

	it("validates all columns before executing", async () => {
		await expect(
			fuzzySearchIds("test", {
				columns: [
					{ table: "Order", column: "customerName" },
					{ table: "Bad", column: "evil" },
				],
			}),
		).rejects.toThrow("[SEARCH] Disallowed fuzzy search column: Bad.evil");
	});
});

// ============================================================================
// Tests: Successful execution
// ============================================================================

describe("fuzzySearchIds — successful execution", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls $transaction and returns matching IDs", async () => {
		mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			return fn({
				$executeRawUnsafe: vi.fn(),
				$queryRaw: [{ id: "id-1" }, { id: "id-2" }],
			});
		});
		// More simply: mock the full transaction to resolve with results
		mockTransaction.mockResolvedValue([{ id: "id-1" }, { id: "id-2" }]);

		const result = await fuzzySearchIds("test query", {
			columns: [{ table: "Order", column: "customerName" }],
		});

		expect(result).toEqual(["id-1", "id-2"]);
		expect(mockTransaction).toHaveBeenCalledOnce();
	});

	it("returns empty array when no results", async () => {
		mockTransaction.mockResolvedValue([]);

		const result = await fuzzySearchIds("no match", {
			columns: [{ table: "User", column: "name" }],
		});

		expect(result).toEqual([]);
	});

	it("uses default limit of 200", async () => {
		mockTransaction.mockResolvedValue([]);

		await fuzzySearchIds("query", {
			columns: [{ table: "Order", column: "customerName" }],
		});

		// The limit is passed into the SQL query, so we just verify it doesn't error
		expect(mockTransaction).toHaveBeenCalledOnce();
	});

	it("accepts a custom limit", async () => {
		mockTransaction.mockResolvedValue([]);

		await fuzzySearchIds("query", {
			columns: [{ table: "Order", column: "customerName" }],
			limit: 50,
		});

		expect(mockTransaction).toHaveBeenCalledOnce();
	});

	it("accepts a baseCondition", async () => {
		mockTransaction.mockResolvedValue([{ id: "x" }]);

		const result = await fuzzySearchIds("query", {
			columns: [{ table: "Order", column: "customerName" }],
			baseCondition: undefined,
		});

		expect(result).toEqual(["x"]);
	});
});

// ============================================================================
// Tests: LIKE wildcard escaping
// ============================================================================

describe("fuzzySearchIds — LIKE wildcard escaping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTransaction.mockResolvedValue([]);
	});

	it("escapes % in the search term", async () => {
		// Should not throw and should call transaction (term was escaped, not rejected)
		await fuzzySearchIds("100%off", {
			columns: [{ table: "Order", column: "customerName" }],
		});
		expect(mockTransaction).toHaveBeenCalledOnce();
	});

	it("escapes _ in the search term", async () => {
		await fuzzySearchIds("test_value", {
			columns: [{ table: "Order", column: "customerName" }],
		});
		expect(mockTransaction).toHaveBeenCalledOnce();
	});

	it("escapes backslash in the search term", async () => {
		await fuzzySearchIds("path\\file", {
			columns: [{ table: "Order", column: "customerName" }],
		});
		expect(mockTransaction).toHaveBeenCalledOnce();
	});
});

// ============================================================================
// Tests: Error handling
// ============================================================================

describe("fuzzySearchIds — error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null on database error (silent catch)", async () => {
		mockTransaction.mockRejectedValue(new Error("connection refused"));

		const result = await fuzzySearchIds("query", {
			columns: [{ table: "Order", column: "customerName" }],
		});

		expect(result).toBeNull();
	});

	it("logs a warning on database error", async () => {
		mockTransaction.mockRejectedValue(new Error("connection refused"));

		await fuzzySearchIds("query", {
			columns: [{ table: "Order", column: "customerName" }],
		});

		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("admin-fuzzy-error"), {
			service: "fuzzy-search",
		});
	});

	it("logs a warning for slow queries (>500ms)", async () => {
		// Simulate a slow query by delaying the transaction resolution
		mockTransaction.mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve([{ id: "1" }]), 600)),
		);

		const result = await fuzzySearchIds("slow query", {
			columns: [{ table: "Order", column: "customerName" }],
		});

		expect(result).toEqual(["1"]);
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("slow-admin-fuzzy"), {
			service: "fuzzy-search",
		});
	});
});

// ============================================================================
// Tests: Nullable columns (COALESCE)
// ============================================================================

describe("fuzzySearchIds — nullable columns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTransaction.mockResolvedValue([]);
	});

	it("handles nullable columns without error", async () => {
		await expect(
			fuzzySearchIds("test", {
				columns: [{ table: "Order", column: "customerEmail", nullable: true }],
			}),
		).resolves.not.toThrow();
	});
});

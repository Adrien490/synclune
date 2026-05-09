import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted to avoid reference errors) ──────────────────

const {
	mockTransaction,
	mockQueryRaw,
	mockSetTrigramThreshold,
	mockSetStatementTimeout,
	mockLogger,
	mockIsPgTrgmAvailable,
} = vi.hoisted(() => ({
	mockTransaction: vi.fn(),
	mockQueryRaw: vi.fn(),
	mockSetTrigramThreshold: vi.fn(),
	mockSetStatementTimeout: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockIsPgTrgmAvailable: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $transaction: mockTransaction, $queryRaw: mockQueryRaw },
}));

// Sentry.startSpan: pass-through to the callback with a no-op span object.
vi.mock("@sentry/nextjs", () => ({
	startSpan: (_options: unknown, callback: (span: { setAttribute: () => void }) => unknown) =>
		callback({ setAttribute: () => {} }),
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/shared/lib/pg-trgm-availability", () => ({
	isPgTrgmAvailable: mockIsPgTrgmAvailable,
}));

vi.mock("../../utils/trigram-helpers", () => ({
	setTrigramThreshold: mockSetTrigramThreshold,
	setStatementTimeout: mockSetStatementTimeout,
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list" },
}));

import { fuzzySearchProductIds } from "../fuzzy-search";

// ─── Helpers ──────────────────────────────────────────────────────

function setupTransaction(
	results: Array<{ productId: string; score: number; totalCount: bigint }>,
) {
	mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
		const tx = { $queryRaw: vi.fn().mockResolvedValue(results) };
		return fn(tx);
	});
}

// ─── Tests ──────────────────────────────────────────────────────

describe("fuzzySearchProductIds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	// ─── Input validation ──────────────────────────────────────

	it("returns empty result for empty string", async () => {
		const result = await fuzzySearchProductIds("");
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("returns empty result for whitespace-only string", async () => {
		const result = await fuzzySearchProductIds("   ");
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("returns empty result for string exceeding max length", async () => {
		const result = await fuzzySearchProductIds("a".repeat(101));
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("returns empty result for very large hostile input (1000 chars)", async () => {
		const result = await fuzzySearchProductIds("x".repeat(1000));
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("returns empty result for whitespace bomb", async () => {
		const result = await fuzzySearchProductIds(" ".repeat(50));
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	// ─── Transaction setup ──────────────────────────────────────

	it("sets trigram threshold and statement timeout in transaction", async () => {
		setupTransaction([]);
		await fuzzySearchProductIds("collier");

		expect(mockSetTrigramThreshold).toHaveBeenCalledWith(expect.anything(), 0.3);
		expect(mockSetStatementTimeout).toHaveBeenCalledWith(expect.anything(), 2000);
	});

	it("uses custom threshold when provided", async () => {
		setupTransaction([]);
		await fuzzySearchProductIds("collier", { threshold: 0.5 });

		expect(mockSetTrigramThreshold).toHaveBeenCalledWith(expect.anything(), 0.5);
	});

	// ─── Result transformation ──────────────────────────────────

	it("returns product IDs in order", async () => {
		setupTransaction([
			{ productId: "id-1", score: 10, totalCount: BigInt(3) },
			{ productId: "id-2", score: 5, totalCount: BigInt(3) },
			{ productId: "id-3", score: 2, totalCount: BigInt(3) },
		]);

		const result = await fuzzySearchProductIds("collier");
		expect(result.ids).toEqual(["id-1", "id-2", "id-3"]);
	});

	it("returns totalCount from first result row", async () => {
		setupTransaction([
			{ productId: "id-1", score: 10, totalCount: BigInt(42) },
			{ productId: "id-2", score: 5, totalCount: BigInt(42) },
		]);

		const result = await fuzzySearchProductIds("collier");
		expect(result.totalCount).toBe(42);
	});

	it("returns totalCount 0 when no results", async () => {
		setupTransaction([]);

		const result = await fuzzySearchProductIds("xyznonexistent");
		expect(result.totalCount).toBe(0);
	});

	it("converts bigint totalCount to number", async () => {
		setupTransaction([{ productId: "id-1", score: 10, totalCount: BigInt(100) }]);

		const result = await fuzzySearchProductIds("collier");
		expect(typeof result.totalCount).toBe("number");
	});

	// ─── Error handling ──────────────────────────────────────

	it("returns empty result on database error", async () => {
		mockTransaction.mockRejectedValue(new Error("DB connection failed"));

		const result = await fuzzySearchProductIds("collier");
		expect(result).toEqual({ ids: [], totalCount: 0 });
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("Fuzzy search error"),
			expect.any(Error),
			expect.objectContaining({ service: "fuzzySearchProductIds" }),
		);
	});

	it("returns empty result on timeout", async () => {
		mockTransaction.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));

		const result = await fuzzySearchProductIds("collier");
		expect(result).toEqual({ ids: [], totalCount: 0 });
	});

	// ─── Multi-word behavior ──────────────────────────────────

	it("processes multi-word search terms", async () => {
		setupTransaction([{ productId: "id-1", score: 15, totalCount: BigInt(1) }]);

		const result = await fuzzySearchProductIds("collier argent");
		expect(result.ids).toEqual(["id-1"]);
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	it("deduplicates words case-insensitively", async () => {
		setupTransaction([{ productId: "id-1", score: 10, totalCount: BigInt(1) }]);

		await fuzzySearchProductIds("Or or collier");
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	// ─── Options ──────────────────────────────────────

	it("passes limit option through", async () => {
		setupTransaction([]);
		await fuzzySearchProductIds("collier", { limit: 10 });
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	it("passes status option through", async () => {
		setupTransaction([]);
		await fuzzySearchProductIds("collier", { status: "PUBLIC" });
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	// ─── pg_trgm fallback ──────────────────────────────────────

	describe("pg_trgm unavailable fallback", () => {
		beforeEach(() => {
			mockIsPgTrgmAvailable.mockResolvedValue(false);
		});

		it("uses $queryRaw directly without $transaction when pg_trgm absent", async () => {
			mockQueryRaw.mockResolvedValue([
				{ productId: "id-1", totalCount: BigInt(1) },
				{ productId: "id-2", totalCount: BigInt(1) },
			]);

			const result = await fuzzySearchProductIds("collier or");

			expect(mockTransaction).not.toHaveBeenCalled();
			expect(mockQueryRaw).toHaveBeenCalledTimes(1);
			expect(result.ids).toEqual(["id-1", "id-2"]);
			expect(result.totalCount).toBe(1);
		});

		it("returns empty result when fallback returns no rows", async () => {
			mockQueryRaw.mockResolvedValue([]);

			const result = await fuzzySearchProductIds("xyz123");

			expect(result).toEqual({ ids: [], totalCount: 0 });
		});

		it("returns empty result on fallback DB error (silent catch)", async () => {
			mockQueryRaw.mockRejectedValue(new Error("connection refused"));

			const result = await fuzzySearchProductIds("collier");

			expect(result).toEqual({ ids: [], totalCount: 0 });
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining("Fuzzy fallback error"),
				expect.any(Error),
				expect.objectContaining({ service: "fuzzySearchProductIds.fallback" }),
			);
		});

		it("does not call setTrigramThreshold in fallback path", async () => {
			mockQueryRaw.mockResolvedValue([]);

			await fuzzySearchProductIds("collier");

			expect(mockSetTrigramThreshold).not.toHaveBeenCalled();
		});

		it("still validates input (empty term short-circuits)", async () => {
			const result = await fuzzySearchProductIds("");

			expect(result).toEqual({ ids: [], totalCount: 0 });
			expect(mockQueryRaw).not.toHaveBeenCalled();
		});
	});
});

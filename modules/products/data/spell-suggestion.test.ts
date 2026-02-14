import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted to avoid reference errors) ──────────────────

const {
	mockTransaction,
	mockSetTrigramThreshold,
	mockSetStatementTimeout,
} = vi.hoisted(() => ({
	mockTransaction: vi.fn(),
	mockSetTrigramThreshold: vi.fn(),
	mockSetStatementTimeout: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $transaction: mockTransaction },
}));

vi.mock("../utils/trigram-helpers", () => ({
	setTrigramThreshold: mockSetTrigramThreshold,
	setStatementTimeout: mockSetStatementTimeout,
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list" },
}));

import { getSpellSuggestion, SUGGESTION_THRESHOLD_RESULTS } from "./spell-suggestion";

// ─── Helpers ──────────────────────────────────────────────────────

type WordMatch = { word: string; similarity: number; source: string };

/**
 * Setup transaction mock to return specific results for each word query.
 * Results are returned in order: first $queryRaw call for first word, etc.
 */
function setupTransaction(resultsByWord: WordMatch[][]) {
	mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
		let callIndex = 0;
		const tx = {
			$queryRaw: vi.fn().mockImplementation(() => {
				const results = resultsByWord[callIndex] ?? [];
				callIndex++;
				return Promise.resolve(results);
			}),
		};
		return fn(tx);
	});
}

// ─── Tests ──────────────────────────────────────────────────────

describe("getSpellSuggestion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	// ─── Input validation ──────────────────────────────────────

	it("returns null for empty string", async () => {
		expect(await getSpellSuggestion("")).toBeNull();
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("returns null for whitespace-only string", async () => {
		expect(await getSpellSuggestion("   ")).toBeNull();
	});

	it("returns null for single character", async () => {
		expect(await getSpellSuggestion("a")).toBeNull();
	});

	it("returns null for string exceeding max length", async () => {
		expect(await getSpellSuggestion("a".repeat(101))).toBeNull();
	});

	// ─── Transaction setup ──────────────────────────────────────

	it("sets suggestion-specific similarity threshold (0.2)", async () => {
		setupTransaction([[]]);
		await getSpellSuggestion("colier");

		expect(mockSetTrigramThreshold).toHaveBeenCalledWith(
			expect.anything(),
			0.2
		);
	});

	it("sets dedicated timeout for suggestions", async () => {
		setupTransaction([[]]);
		await getSpellSuggestion("colier");

		expect(mockSetStatementTimeout).toHaveBeenCalledWith(
			expect.anything(),
			1500
		);
	});

	// ─── Single word suggestion ──────────────────────────────────

	it("returns correction for a single misspelled word", async () => {
		setupTransaction([
			[{ word: "collier", similarity: 0.7, source: "product" }],
		]);

		const result = await getSpellSuggestion("colier");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier");
		expect(result!.similarity).toBe(0.7);
		expect(result!.source).toBe("product");
	});

	it("returns null when no correction found", async () => {
		setupTransaction([[]]);

		const result = await getSpellSuggestion("xyzxyz");
		expect(result).toBeNull();
	});

	// ─── Multi-word suggestion ──────────────────────────────────

	it("corrects individual words in multi-word searches", async () => {
		setupTransaction([
			[{ word: "collier", similarity: 0.7, source: "product" }],
			[{ word: "argent", similarity: 0.6, source: "material" }],
		]);

		const result = await getSpellSuggestion("colier argnt");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier argent");
	});

	it("preserves correct words in multi-word searches", async () => {
		setupTransaction([
			[{ word: "collier", similarity: 0.7, source: "product" }],
			[], // "argent" has no better match
		]);

		const result = await getSpellSuggestion("colier argent");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier argent");
	});

	it("returns null when no words need correction", async () => {
		setupTransaction([
			[], // "collier" has no better match
			[], // "argent" has no better match
		]);

		const result = await getSpellSuggestion("collier argent");
		expect(result).toBeNull();
	});

	it("uses best similarity score for multi-word result", async () => {
		setupTransaction([
			[{ word: "collier", similarity: 0.8, source: "product" }],
			[{ word: "argent", similarity: 0.5, source: "material" }],
		]);

		const result = await getSpellSuggestion("colier argnt");
		expect(result!.similarity).toBe(0.8);
		expect(result!.source).toBe("product");
	});

	// ─── Short words handling ──────────────────────────────────

	it("skips correction for very short words (< 2 chars)", async () => {
		setupTransaction([
			// Only one query for "colier" — "a" is skipped
			[{ word: "collier", similarity: 0.7, source: "product" }],
		]);

		const result = await getSpellSuggestion("a colier");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("a collier");
	});

	// ─── Error handling ──────────────────────────────────────

	it("returns null on database error", async () => {
		mockTransaction.mockRejectedValue(new Error("DB connection failed"));

		const result = await getSpellSuggestion("colier");
		expect(result).toBeNull();
	});

	it("returns null on timeout", async () => {
		mockTransaction.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 5000))
		);

		const result = await getSpellSuggestion("colier");
		expect(result).toBeNull();
	});

	// ─── Options ──────────────────────────────────────

	it("passes status option through", async () => {
		setupTransaction([[]]);
		await getSpellSuggestion("colier", { status: "PUBLIC" });
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	// ─── Exported constants ──────────────────────────────────

	it("exports SUGGESTION_THRESHOLD_RESULTS constant", () => {
		expect(SUGGESTION_THRESHOLD_RESULTS).toBe(3);
	});
});

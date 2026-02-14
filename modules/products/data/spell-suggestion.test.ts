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

type BatchResult = {
	inputWord: string;
	position: number;
	matchWord: string | null;
	similarity: number | null;
	source: string | null;
};

/**
 * Setup transaction mock to return batch results from a single $queryRaw call.
 * The batched query returns all word corrections in one result set.
 */
function setupTransaction(batchResults: BatchResult[]) {
	mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
		const tx = {
			$queryRaw: vi.fn().mockResolvedValue(batchResults),
		};
		return fn(tx);
	});
}

/** Helper to build a batch result row */
function matchRow(
	inputWord: string,
	position: number,
	matchWord: string | null,
	similarity: number | null = null,
	source: string | null = null
): BatchResult {
	return { inputWord, position, matchWord, similarity, source };
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

	it("returns null when all words are too short", async () => {
		expect(await getSpellSuggestion("a b c")).toBeNull();
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	// ─── Transaction setup ──────────────────────────────────────

	it("sets suggestion-specific similarity threshold (0.2)", async () => {
		setupTransaction([]);
		await getSpellSuggestion("colier");

		expect(mockSetTrigramThreshold).toHaveBeenCalledWith(
			expect.anything(),
			0.2
		);
	});

	it("sets dedicated timeout for suggestions", async () => {
		setupTransaction([]);
		await getSpellSuggestion("colier");

		expect(mockSetStatementTimeout).toHaveBeenCalledWith(
			expect.anything(),
			1500
		);
	});

	// ─── Single word suggestion ──────────────────────────────────

	it("returns correction for a single misspelled word", async () => {
		setupTransaction([
			matchRow("colier", 0, "collier", 0.7, "product"),
		]);

		const result = await getSpellSuggestion("colier");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier");
		expect(result!.similarity).toBe(0.7);
		expect(result!.source).toBe("product");
	});

	it("returns null when no correction found", async () => {
		setupTransaction([
			matchRow("xyzxyz", 0, null),
		]);

		const result = await getSpellSuggestion("xyzxyz");
		expect(result).toBeNull();
	});

	// ─── Multi-word suggestion (batched query) ──────────────────

	it("corrects individual words in multi-word searches with single query", async () => {
		setupTransaction([
			matchRow("colier", 0, "collier", 0.7, "product"),
			matchRow("argnt", 1, "argent", 0.6, "material"),
		]);

		const result = await getSpellSuggestion("colier argnt");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier argent");
	});

	it("preserves correct words in multi-word searches", async () => {
		setupTransaction([
			matchRow("colier", 0, "collier", 0.7, "product"),
			matchRow("argent", 1, null), // "argent" has no better match
		]);

		const result = await getSpellSuggestion("colier argent");
		expect(result).not.toBeNull();
		expect(result!.term).toBe("collier argent");
	});

	it("returns null when no words need correction", async () => {
		setupTransaction([
			matchRow("collier", 0, null),
			matchRow("argent", 1, null),
		]);

		const result = await getSpellSuggestion("collier argent");
		expect(result).toBeNull();
	});

	it("uses best similarity score for multi-word result", async () => {
		setupTransaction([
			matchRow("colier", 0, "collier", 0.8, "product"),
			matchRow("argnt", 1, "argent", 0.5, "material"),
		]);

		const result = await getSpellSuggestion("colier argnt");
		expect(result!.similarity).toBe(0.8);
		expect(result!.source).toBe("product");
	});

	it("executes only one $queryRaw call for multi-word search", async () => {
		let queryRawMock: ReturnType<typeof vi.fn>;
		mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
			queryRawMock = vi.fn().mockResolvedValue([
				matchRow("colier", 0, "collier", 0.7, "product"),
				matchRow("argnt", 1, "argent", 0.6, "material"),
			]);
			const tx = { $queryRaw: queryRawMock };
			return fn(tx);
		});

		await getSpellSuggestion("colier argnt");
		expect(queryRawMock!).toHaveBeenCalledTimes(1);
	});

	// ─── Short words handling ──────────────────────────────────

	it("skips correction for very short words (< 2 chars)", async () => {
		// Only "colier" is eligible, "a" is skipped
		setupTransaction([
			matchRow("colier", 1, "collier", 0.7, "product"),
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
		setupTransaction([]);
		await getSpellSuggestion("colier", { status: "PUBLIC" });
		expect(mockTransaction).toHaveBeenCalledTimes(1);
	});

	// ─── Exported constants ──────────────────────────────────

	it("exports SUGGESTION_THRESHOLD_RESULTS constant", () => {
		expect(SUGGESTION_THRESHOLD_RESULTS).toBe(3);
	});
});

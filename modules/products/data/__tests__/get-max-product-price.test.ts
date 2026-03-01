import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAggregate, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockAggregate: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		productSku: { aggregate: mockAggregate },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		MAX_PRICE: "max-product-price",
	},
}));

import { getMaxProductPrice } from "../get-max-product-price";

// ============================================================================
// TESTS
// ============================================================================

describe("getMaxProductPrice", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockAggregate.mockResolvedValue({ _max: { priceInclTax: null } });
	});

	// ─── Cache configuration ─────────────────────────────────────────────────

	it("uses the reference cache profile", async () => {
		await getMaxProductPrice();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("sets the MAX_PRICE cache tag", async () => {
		await getMaxProductPrice();

		expect(mockCacheTag).toHaveBeenCalledWith("max-product-price");
	});

	// ─── Default fallback ────────────────────────────────────────────────────

	it("returns 20000 (200€) when no prices exist in DB", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: null } });

		const result = await getMaxProductPrice();

		expect(result).toBe(20000);
	});

	it("returns 20000 (200€) when aggregate returns zero", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 0 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(20000);
	});

	// ─── Rounding logic ──────────────────────────────────────────────────────

	it("rounds up 4599 to nearest 1000 → 5000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 4599 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(5000);
	});

	it("keeps an exact boundary value unchanged: 10000 stays 10000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 10000 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(10000);
	});

	it("rounds 10001 up to 11000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 10001 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(11000);
	});

	it("rounds 1 up to 1000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 1 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(1000);
	});

	it("rounds 999 up to 1000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 999 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(1000);
	});

	it("keeps a large exact multiple unchanged: 50000 stays 50000", async () => {
		mockAggregate.mockResolvedValue({ _max: { priceInclTax: 50000 } });

		const result = await getMaxProductPrice();

		expect(result).toBe(50000);
	});

	// ─── Prisma query filters ─────────────────────────────────────────────────

	it("filters only active SKUs via isActive: true", async () => {
		await getMaxProductPrice();

		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("filters only PUBLIC products", async () => {
		await getMaxProductPrice();

		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					product: expect.objectContaining({ status: "PUBLIC" }),
				}),
			}),
		);
	});

	it("excludes soft-deleted products by requiring deletedAt: null", async () => {
		await getMaxProductPrice();

		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					product: expect.objectContaining({ deletedAt: null }),
				}),
			}),
		);
	});

	it("aggregates the priceInclTax field via _max", async () => {
		await getMaxProductPrice();

		expect(mockAggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				_max: { priceInclTax: true },
			}),
		);
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns 20000 (200€) when prisma throws an error", async () => {
		mockAggregate.mockRejectedValue(new Error("DB connection failed"));

		const result = await getMaxProductPrice();

		expect(result).toBe(20000);
	});

	it("returns 20000 (200€) when prisma throws a non-Error exception", async () => {
		mockAggregate.mockRejectedValue("unexpected failure");

		const result = await getMaxProductPrice();

		expect(result).toBe(20000);
	});
});

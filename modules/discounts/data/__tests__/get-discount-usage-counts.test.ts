import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		discountUsage: { count: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
		DETAIL: (idOrCode: string) => `discount-${idOrCode}`,
		USAGE: (discountId: string) => `discount-usage-${discountId}`,
	},
	cacheDiscountDetail: vi.fn(),
	cacheDiscounts: vi.fn(),
}));

import { getDiscountUsageCounts } from "../get-discount-usage-counts";

// ============================================================================
// Tests: getDiscountUsageCounts — email de commande = seule identité de la
// limite maxUsagePerUser depuis le retrait de DiscountUsage.userId (Lot 0 S1.5)
// ============================================================================

describe("getDiscountUsageCounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.discountUsage.count.mockResolvedValue(0);
	});

	it("returns a zero count without querying when no customerEmail", async () => {
		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
		});

		expect(result.emailCount).toBe(0);
		expect(mockPrisma.discountUsage.count).not.toHaveBeenCalled();
	});

	it("returns emailCount when customerEmail is provided", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(1);

		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(result.emailCount).toBe(1);
	});

	it("queries discountUsage by discountId and customerEmail via order relation", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(1);

		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(mockPrisma.discountUsage.count).toHaveBeenCalledTimes(1);
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledWith({
			where: {
				discountId: "discount-cuid-001",
				order: {
					customerEmail: "guest@example.com",
				},
			},
		});
	});

	it("calls cacheLife with checkout profile", async () => {
		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(mockCacheLife).toHaveBeenCalledWith("checkout");
	});

	it("calls cacheTag with usage tag for the given discountId", async () => {
		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(mockCacheTag).toHaveBeenCalledWith("discount-usage-discount-cuid-001");
	});
});

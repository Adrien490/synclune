import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
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
// Factories
// ============================================================================

function setupDefaults() {
	mockPrisma.discountUsage.count.mockResolvedValue(0);
}

// ============================================================================
// Tests: getDiscountUsageCounts
// ============================================================================

describe("getDiscountUsageCounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns zero counts when no userId and no customerEmail", async () => {
		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
		});

		expect(result.userCount).toBe(0);
		expect(result.emailCount).toBe(0);
		expect(mockPrisma.discountUsage.count).not.toHaveBeenCalled();
	});

	it("returns userCount when userId is provided", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(3);

		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
		});

		expect(result.userCount).toBe(3);
		expect(result.emailCount).toBe(0);
	});

	it("queries discountUsage by discountId and userId", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(2);

		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
		});

		expect(mockPrisma.discountUsage.count).toHaveBeenCalledWith({
			where: {
				discountId: "discount-cuid-001",
				userId: "user-001",
			},
		});
	});

	it("returns emailCount when customerEmail is provided", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(1);

		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(result.emailCount).toBe(1);
		expect(result.userCount).toBe(0);
	});

	it("queries discountUsage by discountId and customerEmail via order relation", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(1);

		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		expect(mockPrisma.discountUsage.count).toHaveBeenCalledWith({
			where: {
				discountId: "discount-cuid-001",
				order: {
					customerEmail: "guest@example.com",
				},
			},
		});
	});

	it("queries both userCount and emailCount when both are provided", async () => {
		mockPrisma.discountUsage.count
			.mockResolvedValueOnce(2) // userCount
			.mockResolvedValueOnce(4); // emailCount

		const result = await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
			customerEmail: "user@example.com",
		});

		expect(result.userCount).toBe(2);
		expect(result.emailCount).toBe(4);
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledTimes(2);
	});

	it("calls cacheLife with cart profile", async () => {
		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
		});

		expect(mockCacheLife).toHaveBeenCalledWith("cart");
	});

	it("calls cacheTag with usage tag for the given discountId", async () => {
		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
		});

		expect(mockCacheTag).toHaveBeenCalledWith("discount-usage-discount-cuid-001");
	});

	it("does not query userId count when userId is undefined", async () => {
		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			customerEmail: "guest@example.com",
		});

		// Only one count call for email — userId path was skipped
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledTimes(1);
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ order: { customerEmail: "guest@example.com" } }),
			})
		);
	});

	it("does not query email count when customerEmail is undefined", async () => {
		mockPrisma.discountUsage.count.mockResolvedValueOnce(1);

		await getDiscountUsageCounts({
			discountId: "discount-cuid-001",
			userId: "user-001",
		});

		// Only one count call for userId — email path was skipped
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledTimes(1);
		expect(mockPrisma.discountUsage.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-001" }),
			})
		);
	});
});

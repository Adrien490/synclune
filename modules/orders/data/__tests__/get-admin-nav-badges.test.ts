import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { count: vi.fn() },
		refund: { count: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	FulfillmentStatus: { UNFULFILLED: "UNFULFILLED" },
	OrderStatus: { CANCELLED: "CANCELLED" },
	PaymentStatus: { PAID: "PAID" },
	RefundStatus: { PENDING: "PENDING" },
}));

import { getAdminNavBadges } from "../get-admin-nav-badges";

// ============================================================================
// Tests
// ============================================================================

describe("getAdminNavBadges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns counts keyed by NavItem.id (orders + refunds)", async () => {
		mockPrisma.order.count.mockResolvedValue(3);
		mockPrisma.refund.count.mockResolvedValue(2);

		const result = await getAdminNavBadges();

		expect(result).toEqual({ orders: 3, refunds: 2 });
	});

	it("counts only paid, unfulfilled, non-cancelled, non-deleted orders", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockPrisma.order.count).toHaveBeenCalledWith({
			where: {
				deletedAt: null,
				paymentStatus: "PAID",
				fulfillmentStatus: "UNFULFILLED",
				status: { not: "CANCELLED" },
			},
		});
	});

	it("counts only PENDING refunds (awaiting admin validation)", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockPrisma.refund.count).toHaveBeenCalledWith({
			where: { status: "PENDING" },
		});
	});

	it("tags the cache with ADMIN_BADGES for invalidation", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockCacheTag).toHaveBeenCalledWith("admin-badges");
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_PRODUCT_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findUnique: vi.fn() },
		orderItem: { findFirst: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	cacheReviewableProducts: vi.fn(),
}));

import { canUserReviewProduct } from "../can-user-review-product";

// ============================================================================
// TESTS
// ============================================================================

describe("canUserReviewProduct", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return canReview=true when user has delivered order and no existing review", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue(null);
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce({ id: "item-1" });

		const result = await canUserReviewProduct(VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(true);
		expect(result.orderItemId).toBe("item-1");
	});

	it("should return already_reviewed when active review exists", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue({ id: "rev-1", deletedAt: null });

		const result = await canUserReviewProduct(VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("already_reviewed");
		expect(result.existingReviewId).toBe("rev-1");
	});

	it("should allow review when existing review is soft-deleted", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue({ id: "rev-1", deletedAt: new Date() });
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce({ id: "item-2" });

		const result = await canUserReviewProduct(VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(true);
		expect(result.orderItemId).toBe("item-2");
	});

	it("should return order_not_delivered when order exists but not yet delivered", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue(null);
		// First findFirst (delivered orders) returns null
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce(null);
		// Second findFirst (pending orders) returns a match
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce({ id: "item-3" });

		const result = await canUserReviewProduct(VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("order_not_delivered");
	});

	it("should return no_purchase when user never bought the product", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue(null);
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce(null);
		mockPrisma.orderItem.findFirst.mockResolvedValueOnce(null);

		const result = await canUserReviewProduct(VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("no_purchase");
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_PRODUCT_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClient } = vi.hoisted(() => ({
	mockClient: {
		productReview: { findUnique: vi.fn() },
		orderItem: { findFirst: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockClient,
	notDeleted: { deletedAt: null },
}));

import { checkReviewEligibility } from "../eligibility.service";

// ============================================================================
// TESTS
// ============================================================================

describe("checkReviewEligibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns canReview=true with orderItemId when user has delivered order + no review", async () => {
		mockClient.productReview.findUnique.mockResolvedValue(null);
		mockClient.orderItem.findFirst.mockResolvedValueOnce({ id: "item-1" });

		const result = await checkReviewEligibility(
			mockClient as never,
			VALID_USER_ID,
			VALID_PRODUCT_ID,
		);

		expect(result.canReview).toBe(true);
		expect(result.orderItemId).toBe("item-1");
	});

	it("returns already_reviewed when an active review exists", async () => {
		mockClient.productReview.findUnique.mockResolvedValue({ id: "rev-1", deletedAt: null });

		const result = await checkReviewEligibility(
			mockClient as never,
			VALID_USER_ID,
			VALID_PRODUCT_ID,
		);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("already_reviewed");
		expect(result.existingReviewId).toBe("rev-1");
		expect(mockClient.orderItem.findFirst).not.toHaveBeenCalled();
	});

	it("allows review when previous review is soft-deleted", async () => {
		mockClient.productReview.findUnique.mockResolvedValue({
			id: "rev-1",
			deletedAt: new Date(),
		});
		mockClient.orderItem.findFirst.mockResolvedValueOnce({ id: "item-2" });

		const result = await checkReviewEligibility(
			mockClient as never,
			VALID_USER_ID,
			VALID_PRODUCT_ID,
		);

		expect(result.canReview).toBe(true);
		expect(result.orderItemId).toBe("item-2");
	});

	it("returns order_not_delivered when only pending orders match", async () => {
		mockClient.productReview.findUnique.mockResolvedValue(null);
		mockClient.orderItem.findFirst.mockResolvedValueOnce(null); // delivered
		mockClient.orderItem.findFirst.mockResolvedValueOnce({ id: "pending-1" }); // pending

		const result = await checkReviewEligibility(
			mockClient as never,
			VALID_USER_ID,
			VALID_PRODUCT_ID,
		);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("order_not_delivered");
	});

	it("returns no_purchase when user never bought the product", async () => {
		mockClient.productReview.findUnique.mockResolvedValue(null);
		mockClient.orderItem.findFirst.mockResolvedValueOnce(null);
		mockClient.orderItem.findFirst.mockResolvedValueOnce(null);

		const result = await checkReviewEligibility(
			mockClient as never,
			VALID_USER_ID,
			VALID_PRODUCT_ID,
		);

		expect(result.canReview).toBe(false);
		expect(result.reason).toBe("no_purchase");
	});

	it("accepts a Prisma transaction client (interactive tx)", async () => {
		mockClient.productReview.findUnique.mockResolvedValue(null);
		mockClient.orderItem.findFirst.mockResolvedValue({ id: "item-tx" });

		// Same shape — used to validate that the function signature accepts a tx client.
		const txClient = mockClient as never;

		const result = await checkReviewEligibility(txClient, VALID_USER_ID, VALID_PRODUCT_ID);

		expect(result.canReview).toBe(true);
	});
});

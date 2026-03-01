import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_ORDER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	cacheReviewsAdmin: vi.fn(),
}));

import { getOrderForReviewRequest } from "../get-order-for-review-request";

// ============================================================================
// FACTORIES
// ============================================================================

function createOrderForReview() {
	return {
		id: VALID_ORDER_ID,
		orderNumber: "SYN-2026-0001",
		userId: "user_1",
		fulfillmentStatus: "DELIVERED",
		reviewRequestSentAt: null,
		user: { id: "user_1", name: "Marie", email: "marie@test.fr" },
		items: [
			{
				id: "item-1",
				skuId: "sku-1",
				productTitle: "Bracelet Lune",
				quantity: 1,
				sku: {
					id: "sku-1",
					size: "M",
					product: { id: "prod-1", title: "Bracelet Lune", slug: "bracelet-lune" },
					color: { name: "Or" },
					material: { name: "Argent 925" },
					images: [{ url: "https://img.test/1.jpg" }],
				},
				review: null,
			},
		],
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getOrderForReviewRequest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return order with user, items, and review data", async () => {
		const order = createOrderForReview();
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await getOrderForReviewRequest(VALID_ORDER_ID);

		expect(result).toBe(order);
		expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: VALID_ORDER_ID }),
			}),
		);
	});

	it("should return null when order not found", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await getOrderForReviewRequest("nonexistent");

		expect(result).toBeNull();
	});

	it("should return null on database error", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("timeout"));

		const result = await getOrderForReviewRequest(VALID_ORDER_ID);

		expect(result).toBeNull();
	});
});

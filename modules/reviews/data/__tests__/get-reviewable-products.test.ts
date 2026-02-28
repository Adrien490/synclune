import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockGetSession } = vi.hoisted(() => ({
	mockPrisma: {
		orderItem: { findMany: vi.fn() },
		productReview: { findMany: vi.fn() },
	},
	mockGetSession: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		REVIEWABLE: (userId: string) => `reviewable-products-${userId}`,
	},
}));

import { getReviewableProducts } from "../get-reviewable-products";

// ============================================================================
// FACTORIES
// ============================================================================

function createOrderItem(
	overrides: {
		id?: string;
		productId?: string;
		productTitle?: string;
		productSlug?: string;
		deletedAt?: Date | null;
		imageUrl?: string;
	} = {},
) {
	return {
		id: overrides.id ?? "item-1",
		order: {
			createdAt: new Date("2026-01-15"),
			actualDelivery: new Date("2026-01-20"),
		},
		sku: {
			product: {
				id: overrides.productId ?? "prod-1",
				title: overrides.productTitle ?? "Bracelet Lune",
				slug: overrides.productSlug ?? "bracelet-lune",
				deletedAt: overrides.deletedAt ?? null,
				skus: [
					{
						images: overrides.imageUrl
							? [{ url: overrides.imageUrl, blurDataUrl: null, altText: null }]
							: [],
					},
				],
			},
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getReviewableProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return empty array when no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getReviewableProducts();

		expect(result).toEqual([]);
		expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled();
	});

	it("should return reviewable products for authenticated user", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			createOrderItem({ id: "item-1", productId: "prod-1", imageUrl: "https://img.test/1.jpg" }),
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getReviewableProducts();

		expect(result).toHaveLength(1);
		expect(result[0]!.productId).toBe("prod-1");
		expect(result[0]!.productTitle).toBe("Bracelet Lune");
		expect(result[0]!.orderItemId).toBe("item-1");
	});

	it("should deduplicate products from multiple order items", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			createOrderItem({ id: "item-1", productId: "prod-1" }),
			createOrderItem({ id: "item-2", productId: "prod-1" }),
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getReviewableProducts();

		expect(result).toHaveLength(1);
	});

	it("should exclude products already reviewed", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			createOrderItem({ id: "item-1", productId: "prod-1" }),
			createOrderItem({
				id: "item-2",
				productId: "prod-2",
				productTitle: "Collier Etoile",
				productSlug: "collier-etoile",
			}),
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([{ productId: "prod-1" }]);

		const result = await getReviewableProducts();

		expect(result).toHaveLength(1);
		expect(result[0]!.productId).toBe("prod-2");
	});

	it("should exclude soft-deleted products", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			createOrderItem({ id: "item-1", productId: "prod-1", deletedAt: new Date() }),
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getReviewableProducts();

		expect(result).toHaveLength(0);
	});

	it("should handle items with null sku.product", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			{ id: "item-1", order: { createdAt: new Date(), actualDelivery: null }, sku: null },
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getReviewableProducts();

		expect(result).toHaveLength(0);
	});

	it("should return null productImage when no default sku images", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.orderItem.findMany.mockResolvedValue([
			createOrderItem({ id: "item-1", productId: "prod-1" }),
		]);
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getReviewableProducts();

		expect(result[0]!.productImage).toBeNull();
	});
});
